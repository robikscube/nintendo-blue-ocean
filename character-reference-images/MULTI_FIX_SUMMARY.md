# Targeted character multiview fixes
Status: COMPLETE — generated, visually reviewed, promoted and independently verified.
Date: 2026-10-22 (America/Vancouver)

The user confirmed repairing the existing fox/, owl/ and beaver/ folders. The legacy names pip-fox, mori-owl and bolt-beaver in the request/upload manifest refer to those existing folders; no duplicate or renamed folders were created.

## Real delegated artists
Exactly three native subagents ran:
- /root/fox_reference_artist — fox front/back tail remodel.
- /root/owl_reference_artist — owl back-tail addition.
- /root/beaver_reference_artist — beaver left/right horizontal-tail consistency.

Each read the installed consistent-multiview-character-assets and imagegen skills, CHARACTER_DESIGN_GUIDE.md and TRIPO_UPLOAD_MANIFEST.md, inspected actual PNG references, backed up targets, generated drafts using the built-in image editing tool with real local image inputs, and wrote its own report. No manual paintover, placeholders or resampling were used.

## Final changed production PNGs
| Existing file | Approved correction | Final SHA-256 |
|---|---|---|
| fox/front.png | Tail completely occluded behind the body in exact front view; no shoulder wedge or leg/arm protrusion | 1fe7414763beb0c9743533b847e5be77f6d95c18184e264549464240f334d137 |
| fox/back.png | Raised bushy tail at central lower rump, naturally foreshortened; both feet clear | b5e49964e112dfc972d2634ff9706ade094c99ad2fba8bd19e94bd0cf7972da5 |
| owl/back.png | Subtle central taupe feather tail below vest, consistent with side-view volume | ed49eb872d02f7b1a9224bd83260fddcc6fdc0843e5952af66d3e3de56518eed |
| beaver/left.png | Thin horizontal paddle extending behind lower rump, crosshatched top plane | 4f2475d7c91bc80376a8b595de1ebe8008950d01b23e29834dc8ddc5d9ececff |
| beaver/right.png | Matching horizontal paddle, preserving the original target's attire | 20ec6ef0e8db4c7b4342cecbb2f22180443bb2d505ba2a4e813929c76d259c18 |

All five are actual native 1254 x 1254 decodable PNGs. Their canonical bytes equal the independently approved generated candidates. Original backups equal the pre-edit baseline hashes.

## Parent visual review
The parent displayed original targets, relevant untouched side/front/back/hero anchors and every selected candidate at full resolution. Final canonical images were also decoded and reviewed together in drafts/multi-fix-20261022/parent-review.png.
- Fox front-v1 was rejected for a remaining cream shoulder-side tail wedge. Front-v2 and back-v1 were approved. Face, small oval eyes, markings, shirt, body, A-pose, light and framing retained visually.
- Owl candidate-01 was approved: tail is modest and centered above the leg gap; the existing rear patch, vest, wing patterns, tufts, feet, light and framing remain.
- Beaver left-v1/right-v1 were approved: tail pitch, attachment, flat thickness and leg separation now agree with the newer front/back solution. Existing pockets, costume, face and frame were preserved. The previously approved front/back and hero files were not changed.

Generative repair does not promise pixel-identical non-tail pixels; the visual identity and other features were inspected. These remain 2D reference views rather than guaranteed projections of a single mesh. The untouched beaver hero still shows its original raised-tail pose; it was an identity reference and was outside the requested replacement scope.

## Scope verification
The parent captured SHA-256 hashes for all 30 pre-existing non-draft files before generation. Final comparison found exactly the five requested PNG changes above, zero missing originals and 25 byte-identical baseline files. Other views, bear/tortoise, cast sheet, original guides/manifests and prior reports remain unchanged. Added files are reports, backups and generation/QA evidence under drafts plus this summary.

No game source or 3D model files were modified by these image artists. The separate approved dialogue integration is tracked in agent-reports/dialogue-integration-20261022/.

## Reports, prompts and evidence
- drafts/fox-tail-remodel/REPORT.md
- drafts/owl-back-tail-repair/REPORT.md
- drafts/beaver-side-tail-consistency/REPORT.md
- Each task folder contains originals/, candidates/ and generation-evidence.json with the full actual prompts, local image inputs and generated output paths.
- drafts/multi-fix-20261022/baseline.json
- drafts/multi-fix-20261022/final-verification.json
- drafts/multi-fix-20261022/parent-review.png

Six successful built-in image-edit generations were used: fox front-v1/back-v1/front-v2, owl back candidate-01, and beaver left-v1/right-v1. Rejected fox front-v1 is retained without promotion.

