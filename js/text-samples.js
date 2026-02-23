/**
 * text-samples.js — Test text collection
 *
 * Each sample has an id, a short label for the dropdown, and the full text.
 * Add new entries to SAMPLES to make them available in the UI.
 */

export const SAMPLES = [
  {
    id: 'lorem',
    label: 'Lorem Ipsum',
    text:
      'Lorem ipsum dolor sit amet, consectetur adipiscing elit, ' +
      'sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. ' +
      'Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris ' +
      'nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in ' +
      'reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla ' +
      'pariatur. Excepteur sint occaecat cupidatat non proident, sunt in ' +
      'culpa qui officia deserunt mollit anim id est laborum.',
  },
  {
    id: 'bacon',
    label: 'Bacon Ipsum',
    text:
      'Bacon ipsum dolor amet ground round leberkas pork loin prosciutto, ' +
      'jowl ribeye turducken sausage strip steak frankfurter kielbasa cow ham hock meatloaf. ' +
      'Ham kielbasa tongue doner frankfurter, rump meatball short loin beef ribs. ' +
      'Meatball shoulder cow, biltong corned beef porchetta sausage drumstick brisket chislic landjaeger meatloaf pork belly. ' +
      'Shankle pig alcatra swine salami pork chop venison kevin pork belly brisket. ' +
      'Fatback boudin pork belly salami cupim bresaola andouille.\n\n' +
      'Chislic turkey tri-tip ball tip biltong. ' +
      'Chuck buffalo leberkas kielbasa cow swine kevin chicken ground round. ' +
      'Shank boudin salami sausage frankfurter jowl pork loin drumstick strip steak leberkas. ' +
      'Pork belly salami filet mignon shankle brisket tongue burgdoggen pancetta turkey. ' +
      'Rump fatback short ribs swine, chicken pork loin picanha cow chislic brisket.\n\n' +
      'Rump turducken ham hock pig landjaeger, sirloin pork belly pastrami meatloaf pork shankle leberkas. ' +
      'Picanha fatback chuck ham hock shankle chislic landjaeger sausage drumstick. ' +
      'Rump boudin tri-tip ground round, cow kevin short loin salami porchetta cupim. ' +
      'Beef leberkas frankfurter prosciutto cupim tri-tip pig turducken chislic biltong fatback pork chop porchetta. ' +
      'Filet mignon chicken pig doner swine shoulder. ' +
      'Chuck bacon ham hock turducken pork loin. ' +
      'Burgdoggen shank pork corned beef flank ham hock.',
  },
];

/** Get a sample by id, falling back to the first entry. */
export function getSample(id) {
  return SAMPLES.find(s => s.id === id) || SAMPLES[0];
}
