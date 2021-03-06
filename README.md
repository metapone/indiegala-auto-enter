# indiegala-auto-enter
A script to automatically enter Giveaways on IndieGala. This fork uses Steam local data to get a list of user owned games instead of calling Steam APIs, since Steam APIs dont' return removed, banned, limited and other anomalous games. To use this fork, user must be logged in to Steam.

## Installation
Install Tampermonkey and then click [here](https://github.com/metapone/indiegala-auto-enter/raw/master/igautoenter.user.js).

## Options
Edit the script to change the `options`-Object
* `skipOwnedGames` {`Boolean`} - whether or not to skip giveaways of owned games. Requires `steamApiKey` and `steamUserId` if set to `true`. *Added in `2.1.0`.*
* `skipDLCs` {`Boolean/String`} - whether or not to skip giveaways of DLCs. You can also set it to `"missing_basegame"` to only skip DLCs of which you don't own the basegame. This option `"missing_basegame"` however requires you to set `steamApiKey` and `steamUserId`. *Added in `2.2.0`.*
* `maxParticipants` {`Integer`} - set it to a value greater than `0` if you don't want to auto-enter giveaways that already have at least `maxParticipants` participants
* `maxPrice` {`Integer`} - set it to a value greater than `0` if you don't want to auto-enter giveaways that are more expensive than `maxPrince` points.  *Added in `2.2.0`.*
* `minLevel` {`Integer`} - set it to a value greater than `0` if you don't want to auto-enter giveaways that are below that level. *Added in `2.5.0`.*
* `gameBlacklist` {`Array<String/RegExp>`} - add names of games to this array if you don't want to auto-enter specific games (e.g. DLCs IndieGala doesn't recognized as owned or DLCs of games you don't own)
* `onlyEnterGuaranteed` {`Boolean`} - whether or not to only auto-enter guaranteed giveaways
* `userBlacklist` {`Array<String/RegExp>`} - add names of users to this array if you don't want to auto-enter their giveaways
* `skipSubGiveaways` {`Boolean`} - whether or not to auto-enter giveaways that are linked to subs. Those games are usually not recognized correctly as owned. *Added in `1.1.1`.*
* `interceptAlert` {`Boolean`} - whether or not to intercept (and ignore) alerts. *Added in `1.1.4`.*
* `waitOnEnd` {`Number`} - when reaching the last giveaway page the script will wait `waitOnEnd` minutes before it will navigate to the first page and resume its work. *Added in `1.1.4`.*
* `delay` {`Number`} - define how many seconds the script will wait between entering giveaways. *Added in `2.3.0`.*
* `debug` {`Boolean`} - set to `true` if you want to see log output of this script in the console
* `extraTickets` {`Integer`} - how many tickets to buy in extra odds giveaways. Set to `0` to not enter extra odds giveaways at all. *Added in `2.4.0`.*

If there is an update, backup the options first. It will be overwritten otherwise.

## Disclaimer
I don't take any responsibility for damage caused by this software. Use this software at your own risk.
