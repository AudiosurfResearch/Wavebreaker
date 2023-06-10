/* eslint-disable no-cond-assign */
//ESLINT IS *POWERLESS* AGAINST THIS. CRY.

//For your own sanity: do not question anything you are about to see.
//It works. It's beautiful. It's perfect...
const fullTagStringRegex = /(?:\[as-[a-zA-Z0-9]+\]\s*)+$/;
const tagSeparationRegex = /\[as-([a-zA-Z0-9]+)\]/g;

export function tagsFromTitle(title: string): string[] {
  let tagstring;
  return Array.from(
    (tagstring = title.match(fullTagStringRegex)) ? tagstring[0].matchAll(tagSeparationRegex) : [],
    (matchtag) => matchtag[1]
  );
}

export function removeTagsFromTitle(title: string): string {
  return title.slice(0, title.match(fullTagStringRegex).index).trimEnd();
}
