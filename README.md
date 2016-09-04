# indiegala-auto-enter
A script to automatically enter Giveaways on IndieGala

## Installation
Install Tampermonkey and then click [here](https://github.com/Hafas/indiegala-auto-enter/raw/master/igautoenter.user.js).

## Options
Edit the script to change the `options`-Object

* `joinOwnedGames` {`Boolean`} - whether or not to auto-enter giveaways of owned games
* `maxParticipants` {`Integer`} - set it to a value greater than `0` if you don't want to auto-enter giveaways that already have at least `maxParticipants` participants
* `gameBlacklist` {`Array<String/RegExp>`} - add names of games to this array if you don't want to auto-enter specific games (e.g. DLCs IndieGala doesn't recognized as owned or DLCs of games you don't own)
* `onlyEnterGuaranteed` {`Boolean`} - whether or not to only auto-enter guaranteed giveaways
* `userBlacklist` {`Array<String/RegExp>`} - add names of users to this array if you don't want to auto-enter their giveaways
* `skipSubGiveaways` {`Boolean`} - whether or not to auto-enter giveaways that are linked to subs. Those games are usually not recognized correctly as owned. *Added in `1.1.1`.*
* `interceptAlert` {`Boolean`} - whether or not to intercept (and ignore) alerts. *Added in `1.1.4`.*
* `waitOnEnd` {`Number`} - when reaching the last giveaway page the script will wait `waitOnEnd` minutes before it will resume from the first page. *Added in `1.1.4`.*
* `timeout` {`Number`} - when making a request to IndieGala the script will wait `timeout` seconds before it will retry. *Added in `1.1.4`.*
* `debug` {`Boolean`} - set to `true` if you want to see log output of this script in the console

If there is an update, backup the options first. It will be overwritten otherwise.

## Disclaimer
I don't take any responsibility for damage caused by this software. Use this software at your own risk.

## Release Notes
*1.1.4* Added features to prevent some reasons the script may get stuck:
* IndieGala's issues are being displayed in `alerts`, that stop the script until okayed. If `interceptAlert` is set to true, the script will intercept and ignore these messages.
* The script used to travel past the last giveaway page and go further and further and further and further and ... When reaching the last page, it will now return the first page instead. See `waitOnEnd`.
* Sometimes IndieGala seems to be under heavy load and doesn't respond to some requests. The script will now retry if a requests fails or times out. See `timeout`.

*1.1.3*
* Some log changes.
* When asking for owned games, don't ask with gameId as IndieGala does, but with the appId if available.
* Code more documented
* Stop script when not on a giveaway list page (e.g. a details page)

*1.1.2* We are asking IndieGala directly if a game is owned to prevent a race condition between this script and IndieGala's subsequent render of the blue Steam-corner

*1.1.1* replaced `skipImagelessGiveaway` with `skipSubGiveaways`

*1.1.0* `skipImagelessGiveaway` added. Blacklists can now contain regular expressions.

*1.0.4* `shouldEnter` checks reordered

*1.0.3* Unused function `waitForRecharge` removed

*1.0.2* Check before navigating to the next page, if there are coins to spend. If not, don't navigate and wait for recharge.

*1.0.1* Additional log outputs

*1.0.0* Initial Release
