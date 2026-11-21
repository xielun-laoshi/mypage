/* The blog's posts, newest first: what the list shows of each. The post
   itself is a folder here, named by its slug:

     blog/<slug>/post.md     the text, in Markdown (see js/markdown.js)
     blog/<slug>/…           its pictures and its demos' modules

   To add a post: make its folder, write post.md, and add its entry at the
   top of this list. `slug` is its address (#/blogs/<slug>) and its
   folder's name: letters, digits and hyphens, and its own. `date` is
   written as it should read; `summary` is the line or two under its
   title; `tags` are optional. (A slip in this file costs the page its
   posts, not its scripts: js/blog.js reads it with care and says what was
   wrong in the console.) */
export default [
  {
    slug: "no-limit-pokerbot-recap",
    title: "Belated Recap of No Limit: Pokerbot Contest",
    date: "2026-11-19",
    summary: "My bot for No Limit's Boston regional finished 75th of 231. I analyzed six rounds with 8.1 million hands of logs and made a summary of the reasons for its position for reference: it won tables often but went out early, paying off a field that bluffed far less than it assumed.",
    tags: ["Pokerbots", "Game Theory", "CFR"],
  },
];
