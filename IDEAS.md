# celld presentation ideas

this document is intended to be a resource to help plan an app for giving an
interactive presentation on celld, and durable objects. I'd like the examples
to stay small, ideally showing the key aspects on 1 or 2 slides.

Ideas:

- develop using wrangler and vite to start (will migrate to celld later)
- start off with descriptions of how durable objects works architecturally
    - simplicity of S3
    - actor system at infra level
- use some screenshots of praise for durable objects and celld
- context
    - durable-pi just released a few days ago: https://news.ycombinator.com/item?id=49925969
    - same-day, durable objects retrofitted: https://developers.cloudflare.com/changelog/post/2026-10-02-pi-harness/
- no auth
- have a page to function as presenter remote
- have another page to be the audience participation view, with various interfaces that can be set by presenter
- hit the celld http api at some point, showing what it sees
- presenter can scroll through slides, and click the one to show
- gradual reveal of features. start off with context, and show simple things. ideally, a reductive version of the slide code itself is shown (though simpler than what we're actually using).
- start with single durable object, and take that to the limit.
    - then introduce a second durable object, in a contrived example of participatory
- at some point, turn on feature of reaction buttons to float emoji in the background of slides
- later, add live mouse pointers through touch, ideally voronoi segmenting screen, with country flags beside pointers
- at some point, enable a button for people to take a selfie, which go to S3, and get stored for later
- layer on voice transcription
- layer on voice agent
- that agent has a tool for taking selfies and converting them into children book illustrations

## Resources
- https://tlockney.github.io/celld-book/
- https://celld.dev
