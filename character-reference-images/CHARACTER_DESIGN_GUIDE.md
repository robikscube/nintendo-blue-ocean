# Character design guide

## Art direction

These are original animal executives for *Nintendo: The Next Blue Ocean*. Slyvester's revised front view is the master for scale, face treatment, lighting, and material style. The five final front designs appear together in [cast-reference.png](style-guide/cast-reference.png). Folder and draft filenames retain the original internal ids; the display names here are final.

The cast uses compact bodies about 2.5–3 heads tall; broad rounded heads; short, separate legs; simple mitten or wing hands; small vertical black oval eyes with a single tiny highlight; tiny noses and mouths; broad color patches; and matte, gently faceted surfaces. Clothing uses one dominant color, a cream collar, and only a few large details. All production images use a light-gray studio background, orthographic directions, soft light, and a neutral A-pose. The hero images use a front three-quarter view of the same design.

The initial designs had large glossy eyes and detailed facial modeling that read as cinematic animation. After reviewing Nintendo's [official Animal Crossing resident roster](https://www.nintendo.com/sg/switch/acba/namelist/wani.html) and [New Horizons game images](https://www.nintendo.com/en-gb/Games/Nintendo-Switch-games/Animal-Crossing-New-Horizons-1438623.html), the final cast uses smaller graphic features and simpler shapes. This is an art-direction inference from those visual references; the characters, outfits, colors, and meshes are original. Earlier attempts are in `drafts/`.

## Fixed character designs

| Character | Colors and costume | Distinguishing forms | Expression and pose |
| --- | --- | --- | --- |
| **Hootley, owl — Consumer Insight** | Warm taupe body, broad cream facial disk and wing tips, tiny ochre beak and feet; dusty lavender vest with cream collar and two large buttons. | Rounded owl head, paired short feather tufts, thin circular spectacles, wing-like arms and feather-mitten hands. | Kindly inquisitive; neutral A-pose with wing arms clear of torso. |
| **Slyvester, fox — Marketing** | Russet orange, cream muzzle, chest, collar, and tail tip; muted teal short-sleeve top; dark little feet. | Tall pointed ears with coral interiors, angular cream cheek patch, large bushy tail. | Small playful smile; slightly slimmer silhouette and neutral A-pose. |
| **Damian, beaver — Engineering** | Chestnut brown, cream/tan muzzle and chest, dark brown feet and paddle tail; golden tan work vest with cream collar and one broad pocket. | Round ears, two small buck teeth, wide flat crosshatched tail, sturdy mitten arms. | Friendly, ready-to-build expression; stocky A-pose. |
| **Pawson, bear — Finance** | Cocoa brown with flat cream muzzle and belly; burgundy waistcoat with cream collar, three large gold buttons and two broad pockets. | Round head and ears, short eyebrows, stout body, tiny round rear tail. | Gently skeptical, warm expression; sturdy A-pose. |
| **Chair Shelldon, turtle — Big Boss** | Sage green skin, cream lower face and belly; deep navy vest with cream collar; dark olive-brown shell with broad polygon plates. | Broad turtle head with low eyelids, short neck, large domed shell, three-lobed hands. | Calm and composed; stocky A-pose. |

## Multiview production rules

- Model the four directional images as one character. Preserve head scale, eye and muzzle placement, costume seams, and tail or shell attachment across angles.
- `front.png` faces the camera; `left.png` faces image left; `back.png` faces away; `right.png` faces image right. Use `hero-3quarter.png` only as a visual preview.
- Every character image is a 1254×1254 PNG. Keep the character centered, feet visible, and scale consistent. The sheet is 1983×793.
- Use the A-pose and separate arm silhouettes as rigging guidance. At exact 90° profile, the far arm and leg naturally project behind the near ones; confirm their actual separation when building the 3D model.
- Slyvester's bushy tail and Damian's paddle tail are attached at the lower rump. Chair Shelldon's shell is attached behind the torso and must remain visible from both sides and the rear.
- The rear views of Slyvester and Damian were revised to expose both arms. Slyvester's tail still partly overlaps the right foot in the rear projection; reconstruct a separate foot and tail in 3D rather than merging those silhouettes.
- Before accepting a Tripo model, inspect front, sides, rear, arm joints, short legs, glasses, teeth, tail/shell attachment, and texture consistency. These generated views are references, not guaranteed geometric projections of a single 3D mesh.

## Generation prompt summary

Built-in image generation was used. Slyvester's master prompt specified an original russet fox executive with a teal top, compact 2.7-head proportions, small oval eyes, broad flat color patches, matte faceted geometry, a neutral A-pose, and orthographic studio framing. Each other front image used Slyvester only as a style and scale reference with its own species, palette, and costume. Each directional and hero image used its character's final front as the identity reference and specified the angle, fixed details, pose, and background. The cast sheet used all five final fronts as references.
