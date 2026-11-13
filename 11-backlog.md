# Demo Backlog

The demo plan (`10-demo-plan.md`) broken into small chunks. Each chunk fits in one working session and ends with a commit pushed to the branch, so nothing is lost if a session stops partway. **[Proposed]** until Jack confirms.

## How to use this file

- **One chunk per session.** Start a new session, say "do chunk P1-03", and Claude reads this file and the docs it names. Small sessions keep token use down.
- **Commit as you go.** Claude commits and pushes after each chunk, and partway through any chunk that runs long.
- **Track status here.** Mark a chunk `[x]` when done, `[~]` if partly done (with a note on what is left).
- **Owner:** **C** is Claude, **J** is Jack, **C+J** is Claude builds and Jack tests in Godot.

## Non-functional requirements (apply to every chunk)

| ID | Requirement |
|---|---|
| NF-01 | Runs at 60 frames a second on a mid-range PC at 1080p. Steam Deck is a later target. |
| NF-02 | Godot 4, standard build, GDScript only. Both of us use the same exact version. |
| NF-03 | Every number that needs tuning (fares, fuel, speeds, timings) lives in one config resource, not scattered through code. |
| NF-04 | Free assets only, licence recorded in `godot/CREDITS.md` when added. CC0 preferred. |
| NF-05 | Claude owns scripts and generated scenes. Jack owns any hand-dressed showpiece scenes. Neither edits the other's files without saying so. |
| NF-06 | Every chunk leaves the project opening and running with no errors. |
| NF-07 | Keyboard, mouse and controller all work for anything the player does. |
| NF-08 | Calm tone: no time pressure, no fail state, no scares. |
| NF-09 | Text is readable at 1080p and on a Steam Deck screen. Subtitles for all speech. |
| NF-10 | Plain-language docs. Design changes go in the knowledge base, not only in code comments. |

## Phase 0: Set up

- [ ] **P0-01 (J)** Install Godot 4 (standard build). Tell Claude the exact version number.
- [ ] **P0-02 (C)** Create the `godot/` project: folders, `.gitignore`, `CREDITS.md`, config resource (NF-03), an empty main scene that runs. *Done when:* Jack opens it and presses play with no errors.
- [ ] **P0-03 (J)** Work through the official Godot 3D tutorial ("Your first 3D game"). Optional but useful.

## Phase 1: One fare that feels great

- [ ] **P1-01 (C+J)** Greybox street: one straight road with pavements and a junction, made from simple shapes. A free camera to look around. *Done when:* it runs and looks like a street.
- [ ] **P1-02 (C+J)** Cab driving: port the driving model from `poc/` (accelerate, brake, reverse, steer, collisions). Chase camera. *Done when:* Jack says the handling feels right. Expect a few tuning rounds.
- [ ] **P1-03 (C)** Night lighting: sodium street lamps as real lights, dark sky, fog, tone mapping and bloom.
- [ ] **P1-04 (C)** Wet road: reflections and puddles. Rain particles.
- [ ] **P1-05 (C+J)** Cab interior: driver's-seat camera, dashboard, steering wheel that turns, look around by mouse and right stick.
- [ ] **P1-06 (C)** Instruments: speedometer, fuel gauge, clock, indicator tell-tales, all readable (NF-09).
- [ ] **P1-07 (C)** Taxi meter: ticks by distance and time while hired. Fuel use by speed, style and distance.
- [ ] **P1-08 (C)** Windscreen rain and wipers. Rear-view mirror.
- [ ] **P1-09 (C)** City layout file and builder script: a text grid that the script turns into roads, junctions, buildings, lamps and signs.
- [ ] **P1-10 (C)** Street signs: name plates at junctions and green direction signs pointing to landmarks.
- [ ] **P1-11 (C)** Paper street map, drawn from the same layout file. No "you are here".
- [ ] **P1-12 (C)** The single fare: hail, pickup, destination spoken, drop-off, payment, end-of-shift tally.
- [ ] **P1-13 (C)** Controller support and indicators (NF-07).
- [ ] **P1-14 (J)** Playtest the slice against the browser version. List what's worse, what's better.

## Phase 2: The full night

- [ ] **P2-01 (C)** Shift clock: 10pm to 3am, last call about 2:45am, fare in progress can finish.
- [ ] **P2-02 (C)** Fare system: a list of fare definitions (pickup, destination, type, lines) and a picker for the next fare.
- [ ] **P2-03 (C)** Street hails: passengers appear at kerbs around the city during the night.
- [ ] **P2-04 (C)** Radio jobs: dispatcher calls with an address, accept or ignore.
- [ ] **P2-05 (C)** Tips: smooth ride and direct route (define how "direct" is judged, see `04-mechanics.md` open items).
- [ ] **P2-06 (C)** Petrol station: refuel, cost, lower fare if refuelling with a passenger.
- [ ] **P2-07 (C)** Crash fine and running out of fuel (tow fee, shift ends early).
- [ ] **P2-08 (C)** Night tally with fares, tips, fuel, fines, finance paid, XP.
- [ ] **P2-09 (J)** Playtest a full night. Is 15 minutes right? Are 4 to 6 fares right?

## Phase 3: A living city

- [ ] **P3-01 (C)** Lane network generated from the layout file.
- [ ] **P3-02 (C)** Traffic cars that follow lanes and keep their distance.
- [ ] **P3-03 (C)** Traffic lights that traffic obeys.
- [ ] **P3-04 (C)** Pedestrians walking pavements. Parked cars.
- [ ] **P3-05 (C+J)** Districts: centre, station, market, industrial edge, residential, each with its own look.
- [ ] **P3-06 (C)** Performance pass on the busy city (NF-01).

## Phase 4: Progression

- [ ] **P4-01 (C)** XP from fares, clean routes and smooth driving. Level pacing from `09-progression.md`.
- [ ] **P4-02 (C)** Skill tree screen: starter skill plus four tier-1 skills (pending the open question on which).
- [ ] **P4-03 (C)** Skill effects wired into the systems they change.
- [ ] **P4-04 (C)** Finance balance shown through the night and in the tally.
- [ ] **P4-05 (C)** Dashboard Trinkets: buy one, see it in the cab.

## Phase 5: Charm and atmosphere

- [ ] **P5-01 (C+J)** Passengers: 6 to 10 written characters with short lines, seen in the rear-view mirror.
- [ ] **P5-02 (C+J)** Sound: engine, rain, wipers, doors, indicators, meter, from free packs.
- [ ] **P5-03 (C+J)** Cassette deck with free-licence tracks.
- [ ] **P5-04 (C)** Dispatcher radio chatter.
- [ ] **P5-05 (C)** Photo mode.

## Phase 6: Demo wrapper and polish

- [ ] **P6-01 (C)** Title screen, pause menu.
- [ ] **P6-02 (C)** Settings: graphics, audio, controls, key rebinding.
- [ ] **P6-03 (C)** Saving and loading.
- [ ] **P6-04 (C)** Subtitles and accessibility options.
- [ ] **P6-05 (C)** Demo end card with Wishlist button.
- [ ] **P6-06 (C+J)** Export builds for Windows (and Linux for Steam Deck). Performance checks.
- [ ] **P6-07 (J)** Playtesting with strangers. Collect notes into the knowledge base.

## Assets (run alongside the phases)

- [ ] **A-01 (C+J)** Agree the asset family (Kenney city, road and car kits are the starting proposal).
- [ ] **A-02 (J)** Download agreed packs into `godot/assets/`. Record licences in `CREDITS.md`.
- [ ] **A-03 (C)** Asset catalogue: map each placeholder to its model, so swapping is one line.
- [ ] **A-04 (C)** Stylised black cab built from simple shapes (revisit with a Blender model later).

## Marketing (run alongside the phases)

- [ ] **M-01 (J)** Steam page, capsule art and screenshots (from phase 2).
- [ ] **M-02 (C+J)** Trailer plan, 30 to 60 seconds, opening on the hook (after phase 5).
- [ ] **M-03 (J)** Discord or mailing list, and a list of cozy and sim content creators.
