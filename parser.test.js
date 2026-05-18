import { parseWixEmail } from './parser.js';

const FIXTURE = `Notification Summary:
First Name: Mike
Last Name: Jang
Email: shroudysoftware@gmail.com
Location (Country): Canada
Team Size: 3.0
Game Name: PinPow
Steam or Mobile Store Page Link: https://store.steampowered.com/app/4178860/PinPow/
Current Steam Wishlist Total (if applicable): 150.0
Pitch Deck Link: http://pitch.pinpowgame.com/
Do you require funding? If so, please detail your request. If no, please mark "N/A": Not required
Are you interested in Redhaven console porting support? Learn more here: https://www.redhaven.gg: Yes - but also have experience porting to console for the game For the King II
Anything else we should know?: Our current release goals include 9 realms, localization support for 10 languages, and we are targeting a Steam PC release. Shroudy Software is a new small Canadian dev team of 3 and have worked on games like For the King II and Crowgue.
How did you hear about us?: Greenhearth Necromancer
I agree to receive marketing communications from indie.io: true`;

const EXPECTED = {
  full_name:        'Mike Jang',
  studio:           'Shroudy Software',
  email:            'shroudysoftware@gmail.com',
  country:          'Canada',
  team_size:        3,
  game:             'PinPow',
  store_url:        'https://store.steampowered.com/app/4178860/PinPow/',
  store_platform:   'Steam',
  wishlist_count:   150,
  pitch_deck_url:   'http://pitch.pinpowgame.com/',
  has_pitch_deck:   1,
  funding_required: 'No',
  console_interest: 1,
  how_they_heard:   'Greenhearth Necromancer',
};

let passed = 0;
let failed = 0;

const result = parseWixEmail(FIXTURE);

for (const [key, expected] of Object.entries(EXPECTED)) {
  const actual = result[key];
  if (actual === expected) {
    console.log(`  ✓ ${key}: ${JSON.stringify(actual)}`);
    passed++;
  } else {
    console.error(`  ✗ ${key}`);
    console.error(`      expected: ${JSON.stringify(expected)}`);
    console.error(`      actual:   ${JSON.stringify(actual)}`);
    failed++;
  }
}

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
