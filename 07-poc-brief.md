# POC Brief: First Taxi Loop

**Status:** [Confirmed] Jack confirmed this brief on 2026-11-12. Replaces the old loan-shark opening brief, which is in `archive/horror-story/07-poc-brief.md`.

**Goal:** A playable prototype of one short night with a single street-hail fare, so we can feel the core of the game: driving by road signs and a paper map, a taxi meter, fuel drain and an end-of-night tally. Choose the engine and project setup yourself and explain the choice briefly.

## Build this

1. Fade in, seated in a black cab, in rain at night. A 1990s London-style city, unnamed. Amber sodium streetlights. The in-game clock reads 10pm.
2. A short tutorial shows the player how to drive.
3. A passenger hails the cab from the kerb and gets in. They say where they want to go, in words only.
4. The player finds the destination using road signs and a paper street map. No GPS, no arrow, no on-screen route.
5. A taxi meter ticks up with distance and time while the passenger is on board.
6. Fuel drains as the player drives. It depends on speed, driving style and distance travelled, in a simple "mpg" way. The player can see a fuel gauge.
7. The passenger is dropped off, the meter stops and they pay the fare.
8. An end-of-night tally shows: earnings, fuel spent, and the amount taken off the £10,000 cab finance balance.

## Use placeholders for

- The city, as blockout geometry with a small number of signposted streets
- The passenger's appearance and speech
- The fare price per mile and per minute
- The fuel use rates
- Audio and art (temporary sound is fine)

## Don't build

- Skills, XP or levels
- Radio jobs, long hauls or more than one fare
- Tips
- Refuelling stops, crashes, fines or tow fees
- Cab items or cosmetics
- Free play, saving or multiple nights

## Tone

Calm, like Euro Truck Simulator 2. No time pressure, no scares, no music that builds tension. Quiet rain and engine sound is enough.

## Source of truth

`04-mechanics.md`, `05-world.md`, `08-gameplay-loop.md`. Only [Confirmed] items are canon. Treat [Proposed] items as optional.

## Done when

The whole fare can be played from start to finish in one sitting: the passenger gets in, the player finds the destination from signs and the map, the meter and fuel gauge move as expected, the passenger pays, and the tally appears.
