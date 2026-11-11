// PLACEHOLDER DIALOGUE.
//
// The monologue has not been written yet (see 07-poc-brief.md). Only the two
// quoted lines, "Just drive." and "Keep the change.", are canon. Everything
// in MONOLOGUE is stand-in wording that carries the [Confirmed] content from
// 03-structure.md: Mark's backstory, and a high-level sense of why the
// collapse is "good for business". It names no amount and no terms.
//
// Each entry: [text, seconds on screen, seconds of quiet driving afterwards].

export const OPEN_LINE = 'Just drive.';
export const CLOSE_LINE = 'Keep the change.';

export const MONOLOGUE = [
  ['You were driving this cab long before you ever placed a bet, Mark.', 5.5, 4.5],
  ['It never goes all at once. A little here. A little there.', 5, 3.5],
  ['Then one night you look up, and the house is quiet.', 5, 5],
  ['They still pick up the phone, though. That counts for something.', 5, 2.5],
  ['Clear what you owe. Sort yourself out. Or they’re done with you. Their words.', 6, 5.5],
  ['The cab was a nice gesture. We both know it doesn’t cover it.', 5.5, 7],
  ['Look at this place. Lights on, nothing on the shelves.', 5, 3],
  ['Nobody can tell you why. I stopped asking.', 4.5, 5],
  ['People need things. Dressings. Tablets. The chemist’s empty before lunch.', 6, 3],
  ['So they pay what the back door charges. And when they can’t, they come to me.', 6.5, 4],
  ['It’s good for business. I won’t pretend otherwise.', 5, 7],
  ['So you keep driving, Mark. Whatever needs carrying.', 5, 3.5],
  ['Because I know where your family sleeps. I’d rather not have to remember it.', 6.5, 7],
];

// Stand-in cue for the end of the fare (the canon gives no destination).
export const STOP_LINE = 'Here will do.';
