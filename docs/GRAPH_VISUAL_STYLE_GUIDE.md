# Graph Visual Style Guide

This guide records the visual language for the Yansilu graph so future graph and knowledge-work screens can improve from the same baseline instead of re-inventing the look each time.

## Design Intent

The graph should feel like a calm star map for thinking: dense enough to show a living knowledge field, quiet enough that users can still decide where to look next.

Use the starfield metaphor as an information model, not as decoration. Stars are notes, constellations are theme clusters, and relation lines are gravitational hints. The first view should reveal structure and attention. Detail should appear through zoom, hover, selection, or a deliberate filter.

## Color System

- Stage background: use a pale, blue-green near-white surface with a low-contrast grid. The graph belongs inside the product's light workspace and should not become a dark sci-fi panel.
- Ambient field: use soft cyan, teal, sky, and restrained violet for nebulae and cluster glows. Opacity should stay low enough that nodes remain the foreground.
- Node light: use cool whites and cyan highlights for active stars. Use warm amber only for isolated or uncertain nodes.
- Relation colors: keep semantic colors muted. Support is green, flow is blue, conflict is soft red, boundary is amber, bridge is violet, index is slate.
- Contrast rule: labels and controls must remain readable on the light workspace. Graph atmosphere is allowed to be subtle; interactive text is not.

## Lines And Arrows

Relation lines should feel like gravity, not wiring.

- Fit view line width: hairline by default, around `0.24px` to `0.34px`.
- Read/detail line width: can rise modestly, but ordinary lines should stay below `0.7px`.
- Hover/selection width: use opacity, glow, and underlay before using thickness. Avoid heavy selected strokes.
- Underlay: use a blurred low-opacity companion path to create softness. It should suggest a field, not a cable.
- Arrows: hidden in fit view except for focused, selected, or lens-priority paths. When shown, keep marker geometry small and transparent.
- Labels on lines: do not render in the map. Relation meaning belongs in hover cards, selection panels, and the legend.

## Node Hierarchy

Nodes should read as stars with different mass and brightness.

- Dust/minor: render as points in dense fit view. No label, no glint, minimal stroke.
- Medium: small visible star, still quiet in fit view. Label only through zoom, priority, hover, or selection.
- Major/core: visible star with aura and controlled pulse. These can carry labels in fit view when they explain the structure.
- Focus/selected: brightest objects, but still refined. Use halo, glint, and glow rather than oversized circles.
- Isolated/uncertain: warm orbit or dashed ring is allowed, but keep it calm so it does not dominate the galaxy.

## Density Reduction

The graph should reduce noise before users need to fight it.

- Dense fit view should show clusters, hubs, and a limited set of high-explanatory relation paths.
- Long-tail notes become points unless they are selected, prioritized by a reading lens, or part of a chosen neighborhood.
- Not every relation is drawn at fit zoom. More lines can appear in read/detail zoom, explicit filters, hover, and selected neighborhoods.
- Dense hints auto-dismiss after 10 seconds and should never cover the user's working area for long.
- Workbench entries summarize pending clues and follow-up questions outside the map so they do not cover nodes.

## Motion

Motion should make the graph feel alive without making it harder to read.

- Star twinkle: slow, low amplitude, not synchronized.
- Nebula drift: 24s or longer, transform/opacity only.
- Node pulse: only major/core/focus nodes, subtle scale and glow.
- Relation pulse: only focus, selected, bridge, or lens-priority paths.
- Reduced motion: disable continuous twinkle, drift, pulse, and lane animation while preserving static emphasis.

## Interaction Rules

- Fit view answers: "Where are the clusters and what deserves attention?"
- Read zoom answers: "Which local paths should I inspect?"
- Detail zoom answers: "What exactly is connected and why?"
- Hover should sharpen one local neighborhood without turning the rest into clutter.
- Selection should reveal explanation panels and keep visual context around the selected path.
- Workbench panels should open from compact header entries and live beside the graph, not over the star field.

## Reuse For Other Screens

When adapting this language outside the graph:

- Use "ambient + semantic foreground" rather than decorative backgrounds.
- Use brightness, layering, and progressive disclosure for hierarchy.
- Prefer small, precise controls with clear tooltips over explanatory text blocks.
- Keep operational screens quiet. The system can feel futuristic through material quality and motion, not through heavy gradients or spectacle.
