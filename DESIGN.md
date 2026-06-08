---
name: Pro-Service Clarity
colors:
  surface: '#f7f9fb'
  surface-dim: '#d8dadc'
  surface-bright: '#f7f9fb'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f2f4f6'
  surface-container: '#eceef0'
  surface-container-high: '#e6e8ea'
  surface-container-highest: '#e0e3e5'
  on-surface: '#191c1e'
  on-surface-variant: '#5d3f3e'
  inverse-surface: '#2d3133'
  inverse-on-surface: '#eff1f3'
  outline: '#916e6d'
  outline-variant: '#e6bdbb'
  surface-tint: '#bf0029'
  primary: '#b90027'
  on-primary: '#ffffff'
  primary-container: '#e31837'
  on-primary-container: '#fffaf9'
  inverse-primary: '#ffb3b1'
  secondary: '#505f76'
  on-secondary: '#ffffff'
  secondary-container: '#d0e1fb'
  on-secondary-container: '#54647a'
  tertiary: '#535a71'
  on-tertiary: '#ffffff'
  tertiary-container: '#6b738a'
  on-tertiary-container: '#fcfaff'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#ffdad8'
  primary-fixed-dim: '#ffb3b1'
  on-primary-fixed: '#410007'
  on-primary-fixed-variant: '#92001d'
  secondary-fixed: '#d3e4fe'
  secondary-fixed-dim: '#b7c8e1'
  on-secondary-fixed: '#0b1c30'
  on-secondary-fixed-variant: '#38485d'
  tertiary-fixed: '#dae2fd'
  tertiary-fixed-dim: '#bec6e0'
  on-tertiary-fixed: '#131b2e'
  on-tertiary-fixed-variant: '#3f465c'
  background: '#f7f9fb'
  on-background: '#191c1e'
  surface-variant: '#e0e3e5'
typography:
  headline-lg:
    fontFamily: Inter
    fontSize: 32px
    fontWeight: '700'
    lineHeight: 40px
    letterSpacing: -0.02em
  headline-lg-mobile:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '700'
    lineHeight: 32px
  headline-md:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
  headline-sm:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: '600'
    lineHeight: 24px
  body-lg:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  label-md:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '600'
    lineHeight: 16px
    letterSpacing: 0.05em
  button:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '600'
    lineHeight: 20px
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  base: 4px
  xs: 8px
  sm: 16px
  md: 24px
  lg: 32px
  xl: 48px
  gutter: 24px
  margin-mobile: 16px
  container-max: 1200px
---

## Brand & Style
The design system is engineered for the high-velocity environment of F&B operations, where accuracy and speed are paramount. The brand personality is **Modern, Clean, and Practical**, prioritizing utility over decorative flair. 

The aesthetic follows a **Corporate / Modern** approach with a focus on high-clarity information density. It utilizes generous whitespace to reduce cognitive load during complex data conversion tasks. The emotional goal is to evoke a sense of reliability and precision, transforming a technical back-office chore into a streamlined, frictionless experience.

## Colors
The palette is anchored by **Pizzain Red**, used strategically for primary actions and brand presence. The interface remains predominantly neutral to ensure that red "Action" areas and status-specific badges remain highly visible.

- **Primary**: Pizzain Red (#E31837) - Reserved for the "Next" buttons in the wizard and critical brand touchpoints.
- **Backgrounds**: A mix of pure white (#FFFFFF) for cards and light gray (#F8FAFC) for the canvas to create subtle depth.
- **Functional**: Semantic colors (Green, Yellow, Red) are used with a 10% opacity background and a 100% stroke/text for high-readability status badges in data tables.

## Typography
This design system utilizes **Inter** for its exceptional legibility in data-heavy environments. The typographic scale is built on a 4px baseline grid. 

Headlines use tighter letter spacing and heavier weights to provide clear section anchors. Body text is optimized for long-form data review, using a standard 1.5x line height. Labels for table headers and form captions use an uppercase style with increased tracking to differentiate them from interactive content.

## Layout & Spacing
The layout follows a **Fixed Grid** philosophy for the main application canvas, centering content at a maximum width of 1200px to prevent excessive eye travel on wide monitors.

- **Desktop**: 12-column grid with 24px gutters.
- **Tablet**: 8-column grid with 24px gutters.
- **Mobile**: 4-column grid with 16px margins.

Spacing follows a strict 8px-based increment system. Vertical rhythm is maintained by using `md` (24px) spacing between card elements and `xl` (48px) for major section breaks in the wizard.

## Elevation & Depth
This design system uses **Tonal Layers** combined with **Ambient Shadows** to create a structured hierarchy. 

The background canvas sits at the lowest elevation. Interactive cards use a subtle, highly-diffused shadow (0px 4px 12px, 5% opacity black) to appear slightly lifted. This physical metaphor helps users distinguish between the static background and the actionable data containers. Borders are kept minimal and low-contrast (#E2E8F0) to ensure a clean, "light" feel.

## Shapes
The shape language is **Rounded**, using a 0.5rem (8px) base radius. This softens the professional tone, making the tool feel more modern and accessible for F&B staff who may not be "power users."

- **Standard Buttons & Inputs**: 8px (rounded-md)
- **Data Cards**: 16px (rounded-lg)
- **Status Badges & Chips**: Pill-shaped (fully rounded)

## Components

### Progress Stepper
The 4-step wizard uses a horizontal stepper at the top of the page. Completed steps are indicated by a checkmark icon in a Pizzain Red circle. The active step uses a bold label, while future steps are rendered in secondary gray with a thin outline.

### Data Tables
Tables are "zebra-striped" with the light gray neutral color on even rows. Column headers are sticky. Status badges (e.g., "Ready to Export") are pill-shaped with background colors at 10% opacity of their respective semantic color.

### Buttons
- **Primary**: Solid Pizzain Red with white text.
- **Secondary**: Light gray background (#F1F5F9) with dark navy text.
- **Ghost**: No background, red text; used for "Cancel" or "Go Back" actions.

### Form Elements
Inputs use a white background with a 1px border. On focus, the border changes to Pizzain Red with a 2px outer "glow" at 10% opacity.

### Info Boxes & Alerts
Banners are full-width within their containers, using a left-accent border (4px) of the semantic color. Icons are always present on the left to ensure accessibility for color-blind users.