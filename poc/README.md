# POC: First Taxi Loop

Playable prototype of `07-poc-brief.md`: one short night with a single street-hail fare.

## Play

Open `index.html` in a desktop browser (needs an internet connection the first time, to load Three.js and fonts from a CDN).

| Key | Action |
|---|---|
| W / S (or up / down) | Accelerate / brake, then reverse |
| A / D (or left / right) | Steer |
| M | Open or close the paper map |
| C | Driver's seat or outside view |

## Engine choice

Three.js in a single HTML file. It runs from a link with nothing to install, the whole prototype is one readable file, and it is quick to change while the loop is being tuned. Revisit before the full build, as `00-README.md` says.

## What is in it

1. Fade in at 10:00 PM on Canal Street, in rain, under sodium streetlights.
2. A four-step driving tutorial (pull away, steer, brake, map).
3. A passenger hails from the kerb, gets in and says the destination in words only.
4. Navigation by street name plates at every junction, green direction signs on each approach, and a paper map with no "you are here" marker.
5. A taxi meter that ticks up in 20p steps with distance and time.
6. A fuel gauge. Fuel use depends on distance, speed and how hard the accelerator is pressed.
7. Drop-off at the hotel, the meter stops, the passenger pays.
8. End-of-shift tally: fares, fuel spent, and the amount off the £10,000 finance.

## Placeholders

All numbers sit in the `CFG` block at the top of the script in `index.html`.

- Fare: £2.00 flag fall, £3.00 a mile, 50p a game minute.
- Fuel: 25 mpg base, £2.40 a gallon, 10 gallon tank, starting half full.
- Distance is compressed 20 times, to match the clock (one real minute is 20 game minutes).
- The city is a 6 by 5 grid of invented street names with six landmarks. Buildings, the cab and the passenger are blockout shapes.
- Sound is synthesised rain, engine and meter clicks.

## Not built (as the brief says)

Skills, XP, radio jobs, tips, refuelling, crashes, fines, tow fees, cab items, saving and multiple nights. Hitting a building just slows the cab. The tank cannot run dry in a single fare, so running out of fuel is not handled.
