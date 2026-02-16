# Brainstorming: Sidebar Improvements

## Goal
Improve the sidebar aesthetics and functionality by making it collapsible and fixing the 'right margin 0' issue.

## Constraints
- Must maintain existing tag filtering functionality.
- Should be responsive (already handled by `Sheet` for mobile, but needs desktop improvement).
- Premium design according to system instructions.

## Risks
- Layout shift when collapsing/expanding.
- Accessibility of the toggle button.
- Performance if too many animations are added (unlikely for a sidebar).

## Options
1. **Fully Hiding Sidebar**: Toggle button hides the sidebar completely.
2. **Mini Sidebar**: Toggle button collapses the sidebar to a thin bar with icons (might be hard if tags don't have unique icons).
3. **Resizable/Collapsible**: A classic sidebar that can be collapsed to a narrow state or hidden.

## Recommendation
Implement a collapsible sidebar that expands/collapses with a smooth transition. Fix the 'ugly' part by adding proper padding, better typography, and making the selection indicator more refined.
We will use a 'partial collapse' or 'full hide' with a floating toggle button.

## Acceptance Criteria
- Sidebar can be collapsed/expanded.
- Right margin/padding is fixed (selection highlight should not touch the border).
- Visuals are 'premium' (better spacing, subtle hover states, clean transitions).
