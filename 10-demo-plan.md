# Demo Plan

From proof of concept to a Steam demo that makes people wishlist the game. Everything here is **[Proposed]** unless tagged otherwise. Only Jack promotes Proposed to Confirmed.

## Decisions so far [Confirmed]

- **Engine:** Godot 4, scripted in GDScript. The browser proof of concept in `poc/` stays as a reference for look and feel.
- **Art direction:** Stylised low-poly, carried by strong night lighting (rain, sodium lamps, neon, wet reflections).
- **Tone:** Strictly calm. No hint of the shelved horror story in the demo.
- **Budget and team:** Solo, using free resources only for now.
- **Timeline:** The target Next Fest (February, June or October) is chosen closer to the time.

## What makes people wishlist a demo [Proposed]

From research on Steam demos and Next Fest (sources at the end):

- **Show the hook fast.** Players give a demo about 90 seconds. They should be driving within the first minute and feel the hook within five.
- **Teach by doing.** Long text tutorials lose players.
- **Length of 15 to 40 minutes.** Too short and the hook doesn't land; too long and the demo replaces the game.
- **End on momentum with a Wishlist button.** In-demo prompts are reported to lift conversion by 5 to 10 points.
- **Polish over content.** A buggy demo does more harm than no demo.
- **The demo is one part of a funnel.** The Steam page, capsule art, trailer and creator outreach matter as much. Wishlists gathered before Next Fest are the best predictor of wishlists during it.
- **The niche is open.** The main rival, Taxi Life, reviewed poorly for its AI traffic and performance. Most other night-taxi games coming out are horror. A calm, atmospheric, well-made night-shift taxi game has room.

## The pitch [Proposed]

A lofi night drive where you learn the city with no GPS, one fare at a time.

## Wishlist hooks [Proposed]

1. **A mood you can screenshot:** rain, sodium lamps, neon, wet reflections.
2. **The no-GPS hook felt early:** finding a destination from a sign or the paper map within the first five minutes.
3. **Passengers worth remembering:** short, characterful lines seen in the rear-view mirror.
4. **A cassette deck and radio:** calm music, plus dispatcher chatter.
5. **Visible progress:** the finance balance falling, an XP bar, and the first skill choice inside the demo.
6. **A city that feels alive:** traffic, pedestrians and other cabs.

## Demo scope (about 20 to 30 minutes) [Proposed]

- Title screen, settings, pause menu and saving.
- **Night 1, the full 15-minute shift:**
  - 4 to 6 fares, mixing street hails and radio jobs.
  - Tips for a smooth ride and a direct route.
  - One refuel stop.
  - The first level-up and skill choice.
  - The option to buy the first Dashboard Trinket.
- The end-of-shift tally.
- A closing card: "Night 2 and the rest of the city are in the full game", with a Wishlist button.
- Optional: one long-haul fare to the edge of the map as a teaser.

## Free resources [Proposed]

Check the licence on every asset before using it. CC0 needs no credit; CC-BY needs a credit in the game.

| Need | Source | Licence |
|---|---|---|
| City, roads, cars | Kenney (City Kit, Car Kit), Quaternius, KayKit | CC0 |
| Sound effects | Freesound (filtered to CC0), Sonniss GDC audio bundles | CC0 / royalty-free |
| Cassette music | Free Music Archive and similar, filtered by licence | CC0 or CC-BY |
| Fonts | Google Fonts | OFL |

## Phased plan [Proposed]

Each phase ends with something playable.

**Phase 0: Learn and set up (1 to 2 weeks)**
- Install Godot on a local machine and work through its official 3D tutorial.
- Add a `godot/` folder to the repo alongside the design docs.

**Phase 1: One fare that feels great (the vertical slice)**
- Port what the proof of concept proves: driving feel, cab interior and dashboard, rain, wet roads, sodium lighting, paper map, meter, fuel and tally.
- Build a small blockout district from the Kenney kits.
- Done when it looks and feels at least as good as the browser version, at 60 frames a second.

**Phase 2: The full night**
- The 10pm to 3am clock with last call at about 2:45am.
- 4 to 6 fares mixing street hails and radio jobs, with dispatcher lines.
- Tips, refuelling, crash fines, and the tow when the tank runs dry.
- A night tally that includes XP.

**Phase 3: A living city**
- Traffic cars that follow lanes and obey traffic lights.
- Pedestrians and parked cars.
- Recognisable districts: centre, station, market, industrial edge, residential.

**Phase 4: Progression**
- XP, with three level-ups in night 1 (see `09-progression.md`).
- The starter skill plus the four tier-1 skills.
- The visible finance balance, and Dashboard Trinkets as the first thing to buy.

**Phase 5: Charm and atmosphere**
- 6 to 10 passengers with short lines, seen in the rear-view mirror.
- A cassette deck with a few tracks, and full sound design.
- Photo mode for screenshots.

**Phase 6: Demo wrapper and polish**
- Title screen, pause, settings, key rebinding, controller support and saving.
- Subtitles and other accessibility options.
- The end card with the Wishlist button.
- Performance checks, including Steam Deck if possible.
- Playtesting with strangers.

**Alongside the build**
- From phase 2: a Steam page with capsule art and screenshots, so wishlists start early.
- After phase 5: a 30 to 60 second trailer that opens on the hook.
- Before choosing a Next Fest: a Discord or mailing list, and a list of cozy and sim content creators.

## How the work is split [Proposed]

- Claude writes the Godot project as code and text scene files, and tests game logic where it can.
- Jack runs it in the Godot editor on a local machine to see it and judge the feel.
- Feel (steering, lighting, pacing) is tuned in a loop: Jack plays and describes what feels off, Claude adjusts.

## Sources

- [Unity: Steam Next Fest developer tips](https://unity.com/blog/steam-next-fest-developer-tips-unity)
- [Cinevva: Steam Next Fest strategy 2026](https://app.cinevva.com/guides/steam-next-fest-strategy)
- [Presskit.gg: How to build a game demo](https://presskit.gg/field-guides/how-to-build-game-demo)
- [Steam Page Analyzer: Steam demo best practices](https://www.steampageanalyzer.com/blog/steam-demo-best-practices)
- [GTStu: Game demo strategy tactics](https://gtstu.com/2026/06/06/game-demo-strategy-indie/)
- [How To Market A Game: Nobody plays demos and that is OK](https://howtomarketagame.com/2026/06/30/nobody-plays-demos-and-that-is-ok/)
- [How To Market A Game: Spirit City: Lofi Sessions](https://howtomarketagame.com/2024/04/15/spirit-city-lofi-sessions-how-shrinking-down-lead-to-huge-success/)
- [GameDiscoverCo: How Tiny Glade built its way to 600k](https://newsletter.gamediscover.co/p/how-tiny-glade-built-its-way-to-600k)
- [Bugnet: The first five minutes of your game](https://bugnet.io/blog/the-first-five-minutes-of-your-game)
- [Steamworks: Next Fest tips](https://partner.steamgames.com/doc/marketing/upcoming_events/nextfest/tips)
- [OpenCritic: Taxi Life reviews](https://opencritic.com/game/16445/view/reviews)
