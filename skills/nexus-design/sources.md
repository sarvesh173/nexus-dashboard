# Official Source Map and Provenance

Reviewed **2026-10-07 UTC**. URLs below support principles/API contracts, not an
unpublished joint Apple/Google specification. Exact Nexus CSS numbers and spring
profiles are product decisions. Sources may change; recheck versions before
changing a platform claim. Quotations are deliberately short.

## Apple claim ledger

| Claim | Official evidence | Nexus consequence |
| --- | --- | --- |
| Glass is a functional foreground layer | HIG Materials: “Don't use Liquid Glass in the content layer.” | solid/tonal metric, log, chart, task content |
| Regular/Clear are distinct variants | WWDC25 Meet Liquid Glass describes adaptivity and separate variants | one strong web profile; do not mislabel blur strength as native variant |
| Environmental pickup and responsive light | HIG Color / WWDC25: material takes on background colors, nearby color can spill onto it | ambient accent proxy labeled custom, no private pixel sampling |
| Native accessibility adaptation | WWDC25: Reduce Motion “disables any elastic properties”; Reduce Transparency and Increase Contrast adapt material | explicit CSS/JS endpoints; native behavior does not happen automatically on web |
| Dynamic Island / Live Activities | HIG Live Activities defines glanceable platform presentation, not .70–.80/.30–.40s physics | call the web component an activity surface; custom spring values |
| Historical SF Text/Display | WWDC20: Text “below 20 points” / Display “20 points and above” | preserve historical boundary and point units |
| Current variable SF | WWDC20: “no hard break around 20 points anymore,” transition 17–28pt; current Typography HIG recommends continuous optical sizing | `font-optical-sizing: auto`, no forced 20px face swap |
| SF licensing | Fonts license §2: “You may not embed the Apple Font in any software programs or other products” | use installed system font; do not distribute downloaded SF files |
| Fluid, interruptible input | WWDC18 Designing Fluid Interfaces; HIG Motion / Gestures | immediate press, live presentation, pointer capture, velocity, cancellation |

Official links:

- [HIG Materials](https://developer.apple.com/design/human-interface-guidelines/materials)
  · [Apple DocC JSON](https://developer.apple.com/tutorials/data/design/human-interface-guidelines/materials.json)
- [HIG Color](https://developer.apple.com/design/human-interface-guidelines/color)
  · [Apple DocC JSON](https://developer.apple.com/tutorials/data/design/human-interface-guidelines/color.json)
- [HIG Motion](https://developer.apple.com/design/human-interface-guidelines/motion)
  · [Apple DocC JSON](https://developer.apple.com/tutorials/data/design/human-interface-guidelines/motion.json)
- [HIG Gestures](https://developer.apple.com/design/human-interface-guidelines/gestures)
- [HIG Accessibility](https://developer.apple.com/design/human-interface-guidelines/accessibility)
  · [Apple DocC JSON](https://developer.apple.com/tutorials/data/design/human-interface-guidelines/accessibility.json)
- [HIG Typography](https://developer.apple.com/design/human-interface-guidelines/typography)
  · [Apple DocC JSON](https://developer.apple.com/tutorials/data/design/human-interface-guidelines/typography.json)
- [HIG Live Activities](https://developer.apple.com/design/human-interface-guidelines/live-activities)
  · [Apple DocC JSON](https://developer.apple.com/tutorials/data/design/human-interface-guidelines/live-activities.json)
- [Apple Fonts and license](https://developer.apple.com/fonts/)
- [WWDC20 · The details of UI typography](https://developer.apple.com/videos/play/wwdc2020/10175/)
- [WWDC18 · Designing Fluid Interfaces](https://developer.apple.com/videos/play/wwdc2018/803/)
- [WWDC25 · Meet Liquid Glass](https://developer.apple.com/videos/play/wwdc2025/219/)
- [WWDC25 · Get to know the new design system](https://developer.apple.com/videos/play/wwdc2025/356/)
- [SwiftUI spring API](https://developer.apple.com/documentation/swiftui/animation/spring(response:dampingfraction:blendduration:).md)
- [Widget / Live Activity update animations](https://developer.apple.com/documentation/widgetkit/animating-data-updates-in-widgets-and-live-activities.md)

**What these do not establish:** no reviewed Apple source specifies
`blur(28px) saturate(190%)`, a universal 1px rim, a 6% ambient accent, or Dynamic
Island ζ=.70–.80/T=.30–.40s. The generic SwiftUI API's defaults are not evidence
of Dynamic Island's private implementation. A CSS approximation cannot promise
native refraction or adaptive contrast.

## Material / Android claim ledger

| Claim | Official evidence | Nexus consequence |
| --- | --- | --- |
| M1 light model | M1 Environment distinguishes directional key and ambient light | optional separate shadow cues, custom px values |
| M2 states and ink | MDC Web ripple docs/source define origins, interaction feedback, ink-specific opacity maps | native semantic click plus bounded custom ink; independent focus |
| Material 3 / You / Expressive | Android Compose Material 3 guide calls Expressive an expansion | versioned M3 foundation, not invented M4 |
| Android 17 | official release/features pages | Android 17 exists; no verified Google “Android 17 Liquid Glass” spec |
| Dynamic color / Monet | AOSP dynamic-color guidance names wallpaper seed extraction; Android Color explains HCT/MCU | local authorized extraction plus brand fallback |
| Celebi / scoring | MCU published revision: Wu + WSMeans, population/chroma/hue scoring, image opaque pixels/128 clusters | algorithmic seed, not naive dominant RGB |
| HCT model | MCU HCT source: CAM16 hue/chroma and L* tone | separate HCT from OKLCH; gamut can limit chroma |
| Five named containers | AndroidX ColorScheme role definitions | five distinct tiers, onSurface pairing; additional surface roles remain |
| Tonal and shadow depth | AndroidX Surface declares separate tonalElevation/shadowElevation | no-shadow content is Nexus policy, not universal M3 law |
| Baseline typography | Compose guide and TypeScaleTokens | 15 baseline styles in sp, not every Expressive/Wear style |
| Roboto Flex | Google Fonts metadata / Google Design variable fonts | optional OFL font, 13 axes; opsz 8–144 and automatic optical sizing |

Official guidance and implementation links:

- [M1 · Environment](https://m1.material.io/material-design/environment.html)
- [M1 · Elevation and shadows](https://m1.material.io/material-design/elevation-shadows.html)
- [M2 · States](https://m2.material.io/design/interaction/states.html)
- [MDC Web ripple documentation](https://raw.githubusercontent.com/material-components/material-components-web/master/packages/mdc-ripple/README.md)
- [MDC ink state-layer defaults](https://raw.githubusercontent.com/material-components/material-components-web/master/packages/mdc-ripple/_ripple-theme.scss)
- [Material 3 in Compose](https://developer.android.com/develop/ui/compose/designsystems/material3)
- [Android mobile color guidance](https://developer.android.com/design/ui/mobile/guides/styles/color)
- [Android accessibility](https://developer.android.com/design/ui/mobile/guides/foundations/accessibility)
- [Android 17 release](https://developer.android.com/blog/posts/android-17-is-here)
- [Android 17 features](https://developer.android.com/about/versions/17/summary)
- [AOSP dynamic color / Monet](https://source.android.com/docs/core/display/dynamic-color)
- [AndroidX ColorScheme](https://raw.githubusercontent.com/androidx/androidx/androidx-main/compose/material3/material3/src/commonMain/kotlin/androidx/compose/material3/ColorScheme.kt)
- [AndroidX Surface](https://raw.githubusercontent.com/androidx/androidx/androidx-main/compose/material3/material3/src/commonMain/kotlin/androidx/compose/material3/Surface.kt)
- [AndroidX baseline type tokens](https://raw.githubusercontent.com/androidx/androidx/androidx-main/compose/material3/material3/src/commonMain/kotlin/androidx/compose/material3/tokens/TypeScaleTokens.kt)
- [Roboto Flex Google Fonts metadata](https://raw.githubusercontent.com/google/fonts/main/ofl/robotoflex/METADATA.pb)
- [Roboto Flex OFL](https://raw.githubusercontent.com/google/fonts/main/ofl/robotoflex/OFL.txt)
- [Google Design · Variable fonts](https://design.google/library/variable-fonts-are-here-to-stay)
- [Google Chrome · CSS color spaces](https://developer.chrome.com/docs/css-ui/access-colors-spaces)

### Pinned optional MCU recipe evidence

The recipe in [material_spec.md](material_spec.md) targets **MCU 0.4.0**, published
from `eeaf82b8e11bf20f6d8da7c76336575b69e79e01`, not GitHub `main` by assumption.

- [Published package metadata](https://registry.npmjs.org/@material/material-color-utilities/0.4.0)
- [Published Tonal Spot constructor](https://unpkg.com/@material/material-color-utilities@0.4.0/scheme/scheme_tonal_spot.d.ts)
- [Published spec-version type](https://unpkg.com/@material/material-color-utilities@0.4.0/dynamiccolor/color_spec.d.ts)
- [Pinned HCT implementation](https://raw.githubusercontent.com/material-foundation/material-color-utilities/eeaf82b8e11bf20f6d8da7c76336575b69e79e01/typescript/hct/hct.ts)
- [Pinned Celebi quantizer](https://raw.githubusercontent.com/material-foundation/material-color-utilities/eeaf82b8e11bf20f6d8da7c76336575b69e79e01/typescript/quantize/quantizer_celebi.ts)
- [Pinned scoring](https://raw.githubusercontent.com/material-foundation/material-color-utilities/eeaf82b8e11bf20f6d8da7c76336575b69e79e01/typescript/score/score.ts)
- [Pinned image extraction](https://raw.githubusercontent.com/material-foundation/material-color-utilities/eeaf82b8e11bf20f6d8da7c76336575b69e79e01/typescript/utils/image_utils.ts)
- [Pinned legacy theme helper](https://raw.githubusercontent.com/material-foundation/material-color-utilities/eeaf82b8e11bf20f6d8da7c76336575b69e79e01/typescript/utils/theme_utils.ts)
- [Pinned dynamic colors](https://raw.githubusercontent.com/material-foundation/material-color-utilities/eeaf82b8e11bf20f6d8da7c76336575b69e79e01/typescript/dynamiccolor/material_dynamic_colors.ts)

MCU spec strings describe algorithm versions, not Android release numbers. Roles
vary by export/API/platform; success/warning are custom extensions. Contrast
must be rechecked after personalization or any blend/opacity override.

## Web accessibility and implementation evidence

- [WCAG 2.2 recommendation](https://www.w3.org/TR/WCAG22/): text/non-text contrast,
  keyboard, focus, text resize, reflow and target-size requirements.
- [CSS Color 4 · OKLCH](https://www.w3.org/TR/css-color-4/#ok-lab): syntax and space.
- [CSS Filter Effects 2 · backdrop-filter](https://drafts.fxtf.org/filter-effects-2/#BackdropFilterProperty): browser filtering, not native Liquid Glass.
- [CSS Fonts 4 · optical sizing](https://www.w3.org/TR/css-fonts-4/#font-optical-sizing-def): optical-size behavior and explicit variation overrides.
- [HTML dialog](https://html.spec.whatwg.org/multipage/interactive-elements.html#the-dialog-element): native modal semantics/top layer.
- [Pointer Events](https://www.w3.org/TR/pointerevents/): capture, cancellation,
  primary pointer and touch-action ownership.

## Retrieval and certainty limits

Apple HIG HTML and some M2/M3 routes returned JavaScript shells. Substantive HIG
text was verified through **Apple's own DocC JSON**; Material findings use official
Android/AOSP guidance and Google-maintained implementation sources, not invented
text from unreadable pages. AndroidX/Google Fonts rolling links can change; pin a
revision when an application needs exact platform parity. MCU examples are pinned.

No reviewed source establishes the requested Google glass name; this is a bounded
verification result, not a claim that all future Android announcements have been
searched. No unpublished native material or spring implementation is inferred.
Browser tests of Nexus assets do not verify native iOS/Android behavior or supply
legal permission to distribute restricted fonts.
