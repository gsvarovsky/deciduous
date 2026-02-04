# Deciduous
A web app that simplifies building decision trees to model adverse scenarios. Hosted at https://deciduous.vercel.app/

It allows you to document your assumptions about how a system, service, app, etc. will respond to adverse events. Its heritage is in helping defenders anticipate attacker behavior and prepare mitigations accordingly, but it also applies to anticipating reliability-related failures, too.

It is especially useful as a foundation to conduct resilience stress testing / chaos experimentation, allowing you to continually refine your mental models of a system with reality. The end goal of using decision trees is to document your beliefs about how failure will unfold across your system in a given scenario, which can inform design improvements to better sustain resilience to that failure.

Getting started guide: https://kellyshortridge.com/blog/posts/deciduous-attack-tree-app/

Theme options include:
- `theme: default` - the default tree styling
- `theme: accessible` - for more color differentiation between attack and mitigation nodes
- `theme: classic` - classic Graphviz styling
- `theme: dark` - dark mode

For a more detailed write-up of using decision trees in practice, refer to the book [_Security Chaos Engineering: Sustaining Resilience in Software and Systems._](https://www.securitychaoseng.com/)

### Risks and Priorities

The UCL version of Deciduous adds in a number of usability improvements that should be largely intuitive, plus the calculations of risks as follows.

Risks can be shown in the diagram by assigning a top-level key `risk: value`.

Risks are shown for fact, attack and goal nodes in the node display with the prefix "ℙ:" (for probability). For mitigations, risks also exist, but since a risk for a mitigation only exists to pass down to further attacks, the display instead shows the cumulative effect of the mitigation on the goals. This value is shown with the prefix "𝛿:" (for delta probability).

The linkage between nodes can be assigned an _effect_. The easiest way to do this is to add a label to the `from`, suffixed with a value in angle brackets thus: `- from_node_id: Label <1>`. An effect value must be between zero and one. (It's also possible to add an `effect` sub-key to the individual `from` value.)

Effect values cascade down the tree from `facts` to the attacker's `goals`, changing the risk value assigned to graph nodes. By default, all nodes have a risk of 1. This is most easy to interpret for `facts`: since facts are true, the risk of the fact being true is 1. From their initial values, risks are affected by effect values as follows:

1. Effect values in the _froms_ of a fact, attack or goal node affect the risk of the node itself. The risk of each _from_ node are multiplied by the effect, combining with an exclusive OR (thus, the risks are added).
2. Effect values in the _froms_ of a mitigation node affect the _from_ node, reducing its risk by the effect value (calculated by multiplying the risk by `1 - effect`).

Since this calculation is not always easy to interpret, the top-level `risk` key can be set to `risk: calc`, the diagram then showing the risk calculation in place of the value.

## Examples
Example trees for #inspo are hosted in [/examples](./examples).

#### Security
* [S3 Bucket with Video Recordings](./examples/s3-bucket-video-recordings.yaml)
* [Cryptominer in a Container](./examples/cryptominer-in-container.yaml) ([video explanation](https://youtu.be/oJ3iSyhWb5U?t=460))

#### Reliability
* [Missing Logs](./examples/missing-logs.yaml) ([video explanation](https://www.youtube.com/watch?v=DGdtfB1eY98))
* [Unrealistic Traces](./examples/unrealistic-traces.yaml)

#### Surrealism
* [Thanksploitation](./examples/thanksploitation.yml) scenario from Rick and Morty ([blog post](https://kellyshortridge.com/blog/posts/rick-morty-thanksploitation-decision-tree/))
