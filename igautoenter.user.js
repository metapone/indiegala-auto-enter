// ==UserScript==
// @name         IndieGala: Auto-enter Giveaways
// @version      1.1.4
// @description  Automatically enters IndieGala Giveaways
// @author       Hafas (https://github.com/Hafas/)
// @match        https://www.indiegala.com/giveaways*
// @grant        none
// ==/UserScript==

(function () {
  /**
   * change values to customize the script's behaviour
   */
  var options = {
    //set to 0 to ignore the number of participants
    maxParticipants: 0,
    //Array of names of games
    gameBlacklist: [],
    onlyEnterGuaranteed: false,
    //Array of names of users
    userBlacklist: [],
    //Some giveaways don't link to the game directly but to a sub containing that game. IndieGala is displaying these games as "not owned" even if you own that game
    skipSubGiveaways: false,
    interceptAlert: false,
    //how many minutes to wait at the end of the line until restarting from the beginning
    waitOnEnd: 60,
    //how many seconds to wait for a respond by IndieGala
    timeout: 30,
    //Display logs
    debug: false
  };

  var waitOnEnd = options.waitOnEnd * 60 * 1000;
  var timeout = options.timeout * 1000;

  /**
   * current user state
   */
  var my = {
    level: undefined,
    coins: undefined,
    nextRecharge: undefined
  };

  /**
   * entry point of the script
   */
  function start () {
    if (!getCurrentPage()) {
      //I'm not on a giveaway list page. Script stops here.
      log("Current page is not a giveway list page. Stopping script.");
      return;
    }
    getLevel().done(function (payload) {
      setLevel(payload);
      getUserData().done(function (payload) {
        setData(payload);
        if (!okToContinue()) {
          //will navigate to first page on next recharge
          return;
        }
        var giveaways = getGiveaways();
        return setOwned(giveaways).then(enterGiveaways).then(function () {
          if (okToContinue()) {
            navigateToNext();
          }
        });
      }).fail(function (err) {
        //Script stops here. Common cause is that the user is not logged in
        error("Something went wrong:", err);
      });
    }).fail(function (err) {
      //Script stops here. Common cause is that the user is not logged in
      error("Something went wrong:", err);
    });
  }

  var IdType = {
    APP: "APP",
    SUB: "SUB"
  };

  /**
   * returns true if the logged in user has coins available.
   * if not, it will return false and trigger navigation to the first giveaway page on recharge
   */
  function okToContinue () {
    if (my.coins === 0) {
      info("No coins available. Waiting for recharge. Expected recharge at", new Date(new Date().getTime() + my.nextRecharge));
      setTimeout(navigateToStart, my.nextRecharge);
      return false;
    }
    return true;
  }

  /**
   * collects user information including level, coins and next recharge
   */
  function getLevel () {
    return request("/giveaways/get_user_level_and_coins");
  }
  function getUserData() {
    return request("/profile", "GET", undefined, "html");
  }

  /**
   * sets the owned-property of each giveaway, by sending a request to IndieGala
   */
  function setOwned (giveaways) {
    var gameIds = giveaways.map(function (giveaway) {
      if (giveaway.idType === IdType.APP) {
        return giveaway.steamId;
      }
      return giveaway.gameId;
    });
    return request.post("/giveaways/match_games_in_steam_library", {"games_id": gameIds}).then(function (ownedIds) {
      for (var i = 0; i < giveaways.length; ++i) {
        var giveaway = giveaways[i];
        for (var j = 0; j < ownedIds.length; ++j) {
          if (giveaway.idType === IdType.APP && giveaway.steamId == ownedIds[j] || giveaway.gameId == ownedIds[j]) {
            log("I seem to own '%s' (gameId: '%s')", giveaway.name, giveaway.gameId);
            giveaway.owned = true;
            break;
          }
        }
        if (!giveaway.owned) {
          log("I don't seem to own '%s' (gameId: '%s')", giveaway.name, giveaway.gameId);
          giveaway.owned = false;
        }
      }
      return giveaways;
    });
  }

  /**
   * puts the result of getUserData into the my-Object
   */
  function setLevel (data) {
    log("setLevel", "data", data);
    my.level = parseInt(data.current_level);
    my.level = isNaN(my.level) ? 0 : my.level;
  }
  function setData (data) {
    log("setData", "data", data);
    my.coins = parseInt($(data).find('#silver-coins-menu').html());
    my.nextRecharge = (parseInt($(data).find('#next-recharge-mins').html()) + 1) * 60 * 1000;
    my.coins = isNaN(my.coins) ? 0 : my.coins;
    my.nextRecharge = isNaN(my.nextRecharge) ? 20 * 60 * 1000 : my.nextRecharge;
  }

  /**
   * iterates through each giveaway and enters them, if possible and desired
   */
  function enterGiveaways (giveaways) {
    log("Entering giveaways", giveaways);
    return eachSeries(giveaways, function (giveaway) {
      if (!giveaway.shouldEnter()) {
        return $.when();
      }
      return giveaway.enter().then(function (payload) {
        log("giveaway entered", "payload", payload);
        if (payload.status === "ok") {
          my.coins = payload.new_amount;
        } else {
          error("Failed to enter giveaway. Status: %s. My: %o", payload.status, my);
        }
      });
    });
  }

  /**
   * utility function to call promises successively
   */
  function eachSeries (collection, action) {
    if (!Array.isArray(collection)) {
      return $.when();
    }
    var currentIndex = 0;
    function callNext () {
      if (currentIndex >= collection.length) {
        return $.when();
      }
      return $.when(action(collection[currentIndex++])).then(callNext);
    }
    return callNext();
  }

  var LEVEL_PATTERN = /LEVEL ([0-9]+)/;
  var PARTICIPANTS_PATTERN = /([0-9]+) participants/;
  var APP_ID_PATTERN = /^([0-9]+)(?:_(?:bonus|promo|ig))?$/;
  var SUB_ID_PATTERN = /^sub_([0-9]+)$/;
  var FALLBACK_ID_PATTERN = /([0-9]+)/;
  /**
   * parses the DOM and extracts the giveaway. Returns Giveaway-Objects, which include the following properties:
   id {String} - the giveaway id
   name {String} - name of the game
   price {Integer} - the coins needed to enter the giveaway
   minLevel {Integer} - the minimum level to enter the giveaway
   participants {Integer} - the current number of participants, that entered that giveaway
   guaranteed {Boolean} - whether or not the giveaway is a guaranteed one
   by {String} - name of the user who created the giveaway
   entered {Boolean} - wheter or not the logged in user has already entered the giveaway
   steamId {String} - the id Steam gave this game
   idType {"APP" | "SUB" | null} - "APP" if the steamId is an appId. "SUB" if the steamId is a subId. null if this script is not sure
   gameId {String} - the gameId IndieGala gave this game. It's usually the appId with or without a suffix, or the subId with a "sub_"-prefix
   */
  function getGiveaways () {
    var giveawayDOMs = $(".col-xs-6.tickets-col .ticket-cont");
    var giveaways = [];
    for (var i = 0; i < giveawayDOMs.length; ++i) {
      var giveawayDOM = giveawayDOMs[i];
      var infoText = $(".price-type-cont .right", giveawayDOM).text();
      var gameId = $(".giveaway-game-id", giveawayDOM).attr("value");
      var match;
      var steamId = null;
      var idType = null;
      if (match = APP_ID_PATTERN.exec(gameId)) {
        steamId = match[1];
        idType = IdType.APP;
      } else if (match = SUB_ID_PATTERN.exec(gameId)) {
        steamId = match[1];
        idType = IdType.SUB;
      } else {
        error("Unrecognized id type in '%s'", gameId);
        if (match = FALLBACK_ID_PATTERN.exec(gameId)) {
          steamId = match[1];
        }
      }
      giveaways.push(new Giveaway({
        id: $(".ticket-right .relative", giveawayDOM).attr("rel"),
        name: $(".game-img-cont a", giveawayDOM).attr("title"),
        price: parseInt($(".ticket-price strong", giveawayDOM).text()),
        minLevel: parseInt(LEVEL_PATTERN.exec(infoText)[1]),
        owned: undefined, //will be filled in later in setOwned()
        participants: parseInt(PARTICIPANTS_PATTERN.exec($(".ticket-info-cont .fa.fa-users", giveawayDOM).parent().text())[1]),
        guaranteed: infoText.indexOf("not guaranteed") === -1,
        by: $(".ticket-info-cont .steamnick a", giveawayDOM).text(),
        entered: $(".ticket-right aside", giveawayDOM).length === 0,
        steamId: steamId,
        idType: idType,
        gameId: gameId
      }));
    }
    return giveaways;
  }

  /**
   * whether or not a game by name is in the blacklist
   */
  function isInGameBlacklist (name) {
    return isInBlacklist(options.gameBlacklist, name);
  }

  /**
   * whether or not a user by name is in the blacklist
   */
  function isInUserBlacklist (name) {
    return isInBlacklist(options.userBlacklist, name);
  }

  /**
   * utility function that checks if a name is in a blacklist
   */
  function isInBlacklist(blacklist, name) {
    if (!Array.isArray(blacklist)) {
      return false;
    }
    for (var i = 0; i < blacklist.length; ++i) {
      var blacklistItem = blacklist[i];
      if (blacklistItem instanceof RegExp) {
        if (blacklistItem.test(name)) {
          return true;
        }
      } if (name === blacklistItem) {
        return true;
      }
    }
    return false;
  }

  /**
   * Giveaway constructor
   */
  function Giveaway (props) {
    for (var key in props) {
      if (props.hasOwnProperty(key)) {
        this[key] = props[key];
      }
    }
  }

  /**
   * returns true if the script can and should enter a giveaway
   */
  Giveaway.prototype.shouldEnter = function () {
    if (this.entered) {
      log("Not entering '%s' because I already entered", this.name);
      return false;
    }
    if (this.owned) {
      log("Not entering '%s' because I already own it", this.name);
      return false;
    }
    if (isInGameBlacklist(this.name)) {
      log("Not entering '%s' because this game is on my blacklist", this.name);
      return false;
    }
    if (isInUserBlacklist(this.by)) {
      log("Not entering '%s' because the user '%s' is on my blacklist", this.name, this.by);
      return false;
    }
    if (!this.guaranteed && options.onlyEnterGuaranteed) {
      log("Not entering '%s' because the key is not guaranteed to work (onlyEnterGuaranteed? %s)", this.name, !!options.onlyEnteredGuaranteed);
      return false;
    }
    if (options.maxParticipants && this.participants > options.maxParticipants) {
      log("Not entering '%s' because too many are participating (participants: %s, max: %s)", this.name, this.participants, options.maxParticipants);
      return false;
    }
    if (this.idType === IdType.SUB && options.skipSubGiveaways) {
      log("Not entering '%s' because this giveaway is linked to a sub (skipSubGiveaways? %s)", this.name, !!options.skipSubGiveaways);
      return false;
    }
    if (this.minLevel > my.level) {
      log("Not entering '%s' because my level is insufficient (mine: %s, needed: %s)", this.name, my.level, this.minLevel);
      return false;
    }
    if (this.price > my.coins) {
      log("Not entering '%s' because my funds are insufficient (mine: %s, needed: %s)", this.name, my.coins, this.price);
      return false;
    }
    return true;
  };

  /**
   * sends a POST-request to enter a giveaway
   */
  Giveaway.prototype.enter = function () {
    info("Entering giveaway", this);
    return request.post("/giveaways/new_entry", {giv_id: this.id, ticket_price: this.price});
  };

  /**
   * navigate to the first giveaway page
   */
  function navigateToStart () {
    navigateToPage(1);
  }

  /**
   * navigates to the next giveaway page; navigates to the first page if there is no next page
   */
  function navigateToNext () {
    if (hasNext()) {
      navigateToPage(getCurrentPage() + 1);
    } else {
      info("Reached the end of the line. Waiting %s minutes", options.waitOnEnd);
      setTimeout(navigateToStart, waitOnEnd);
    }
  }

  /**
   * navigates to {pageNumber}th giveaway page
   */
  function navigateToPage (pageNumber) {
    var target = "/giveaways/" + pageNumber + "/expiry/asc/level/all";
    log("navigating to", target);
    window.location = target;
    setTimeout(function () {
      log("Navigation seems stuck. Retrying ...");
      navigateToPage(pageNumber);
    }, timeout);
  }

  /**
   * calls console.log if debug is enabled
   */
  function log () {
    if (!options.debug) {
      return;
    }
    console.log.apply(console, arguments);
  }

  /**
   * calls console.error if debug is enabled
   */
  function error () {
    if (!options.debug) {
      return;
    }
    console.error.apply(console, arguments);
  }

  /**
   * calls console.info if debug is enabled
   */
  function info () {
    if (!options.debug) {
      return;
    }
    console.info.apply(console, arguments);
  }

  /**
   * calls console.warn if debug is enabled
   */
  function warn () {
    if (!options.debug) {
      return;
    }
    console.warn.apply(console, arguments);
  }

  var PAGE_NUMBER_PATTERN = /^\/giveaways(?:\/([0-9]+)\/|\/?$)/;
  /**
   * returns the current giveaway page
   */
  function getCurrentPage () {
    var currentPath = window.location.pathname;
    var match = PAGE_NUMBER_PATTERN.exec(currentPath);
    if (match === null) {
      return null;
    }
    if (!match[1]) {
      return 1;
    }
    return parseInt(match[1]);
  }

  /**
   * returns true if there is a next page
   */
  function hasNext () {
    //find the red links and see if one of them is "NEXT"
    return $("a.prev-next.palette-background-1").text().indexOf("NEXT") >= 0;
  }

  if (options.interceptAlert) {
    window.alert = function (message) {
      warn("alert intercepted:", message);
    };
  }

  /**
   * sends an HTTP-Request
   */
  var request = function (url, method, body, returntype) {
    method = method || "GET";
    returntype = returntype || "json";
    return $.when().then(function () {
      return $.ajax({
        url: url,
        type: method,
        dataType: returntype,
        data: body ? JSON.stringify(body) : undefined,
        timeout: timeout
      }).then(null, function (error) {
        if (error.status === 200) {
          return $.Deferred().reject(error);
        }
        log("Request to", method, url, "failed or timed out. Retrying ...", error);
        return request(url, method, body);
      });
    });
  };

  /**
   * sends an HTTP-POST-Request
   */
  request.post = function (url, body) {
    return request(url, "POST", body);
  };

  start();
})();
