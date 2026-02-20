
# Brainstorm: Batch Wizard UX & UI Refinements (Revision 1)

## Goal
Overhaul the Batch Wizard to use a **Side Sheet** layout, replace the FAB with a **Sticky Bottom Bar**, and clarify the **Batch Model** (formerly "Cart").

## Naming Convention
To avoid confusion with the order status names, we are adopting the following terminology:
1.  **Cart / Staging Area** -> **"Batch Pengiriman"** (or simply "Batch").
2.  **Add to Cart Action** -> **"Pindah ke Batch"**.
3.  **Remove from Cart Action** -> **"Hapus dari Batch"**.

## Constraints
1.  **Status Name Integrity**: The order status remains `staged` (displayed as "Siap Kirim" in badges), but the collective container is called the **Batch**.
2.  **Action Logic**:
    *   **"Pindah ke Batch" (Green)**: Only shown if the selection contains items *outside* the Batch (status != 'staged').
    *   **"Hapus dari Batch" (Red)**: Only shown if the selection contains items *already in* the Batch (status == 'staged').
    *   *Result*: If all selected items are already in the Batch, the user **only** sees the "Hapus dari Batch" button.

## Consolidated Plan

### 1. The Batch Model ("Batch Pengiriman")
-   **Concept**:
    *   **Inbox / Tags**: Browse orders in different sources.
    *   **Batch Pengiriman Tab**: Virtual sidebar item. Shows *only* orders with `status: 'staged'`. Acts as the "Loading Dock".
    *   **Batch Wizard**: The checkout/fulfillment flow (checkout from Batch).
-   **Visibility**:
    *   **Header "Batch" Button**: Persistent button showing staged count e.g., `📦 Batch (3)`. Triggers the Wizard.

### 2. Triggers & Controls

#### A. The Checkout Trigger (Header)
-   **Action**: Opens **Batch Wizard** (Side Sheet).
-   **State**: Hidden or disabled if Batch count is `0`.

#### B. The Selection Trigger (Sticky Bottom Bar)
-   **Appearance**: Dark glassmorphism, floating bottom center.
-   **Green Button ("Pindah ke Batch")**: Triggers `stageOrders`.
-   **Red Button ("Hapus dari Batch")**: Triggers `unstageOrders`.

### 3. Technical Considerations
-   **Sidebar**: Inject a static "**Batch Pengiriman**" item at the top of `TagSidebar`.
-   **Color Palette**: Use semantic colors (Green for progression, Red for removal/destructive) to improve affordance.

## Acceptance Criteria
-   [ ] **Naming**: All "Siap Kirim" references for the cart/batch container updated to "**Batch Pengiriman**".
-   [ ] **Action Colors**: "Pindah ke Batch" is **Green**; "Hapus dari Batch" is **Red**.
-   [ ] **Visibility Logic**: Sticky Bar only offers "Pindah ke Batch" if NON-staged items are selected.
-   [ ] **Visibility Logic**: Sticky Bar only offers "Hapus dari Batch" if staged items are selected.
-   [ ] **Z-Index**: Order Edit Sheet layers correctly over the Batch Wizard Sheet.
