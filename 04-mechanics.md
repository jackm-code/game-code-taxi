# Mechanics

Described in plain language only. No technical design yet.

## Driving and navigation [Confirmed]

- The player drives a black cab.
- No GPS. Road signs and a paper street map are the navigation.
- Next jobs come in over the radio from the dispatcher.

## Fares and pay

- Pay comes from a taxi meter that ticks up with distance and time. [Confirmed]
- The meter works with the fuel system, since longer trips cost more fuel but earn more. [Confirmed]
- Refuelling with a passenger on board reduces the fare. [Confirmed]

## Tips [Confirmed]

- A smooth ride earns a small tip.
- Taking the direct route earns a bigger tip, because route-finding is the main skill in a game with no GPS.
- A longer route still pays by the meter, but earns no tip.

## Kinds of fare [Confirmed]

- **Street hail:** Quick, short fares picked up from the kerb.
- **Radio job:** Booked pickups from the dispatcher, with an address to find on the map.
- **Long haul:** An airport or out-of-town run that pays well but burns a lot of fuel.

## Fuel and running costs [Confirmed]

- Running costs come first, and fuel is the only running cost.
- A simple "mpg" system: fuel use depends on driving speed, driving style and distance travelled.
- The player can stop to refuel while carrying a passenger, but the fare pays less if they do.
- There are no repairs.

## Money [Confirmed]

Earnings pay off the £10,000 finance on the player's cab. The balance is visible.

## Night length [Confirmed]

- The shift starts at 10pm and ends at 3am, five in-game hours.
- A night is a placeholder 15 minutes of play on a compressed in-game clock, so one real minute is 20 game minutes.
- Last call is about 2:45am. A fare in progress can be finished.

## Failing a night and crashes [Confirmed]

- A night cannot be failed. A bad night just earns less.
- Running out of fuel costs a small tow fee and ends the shift early.
- A crash causes a short stall and a small fine, docked from that fare's pay. The fare carries on.

## Passengers [Proposed]

Optional conversations with passengers, seen in the rear-view mirror, as flavour. They do not affect the loop.

## Still to define [Open]

- Fine and tow fee amounts
- Tip amounts and how "direct route" is judged
- Whether refuelling cost scales with fuel price or is a flat rate
