# Goal
When a user opts into insurance for a shipment, we need a frictionless way to collect the mandatory `item category` and `item price` for *each item* within the order, and automatically calculate the total insurance fee.

# Constraints
- The item category is limited to a predefined list (15 choices from `item category.csv`).
- The item price is required when insurance is selected.
- The UI should not be cluttered if insurance is not selected.
- Insurance price is fixed at 0.2% of the item price.
- Insurance must be specified *per item category* because insurance vendors track claims based on specific item categories (e.g., if a phone is lost but it was insured as "documents", the claim is rejected).
- Orders might contain multiple items with different categories (e.g., 1 phone, 3 shirts).
- **No Partial Insurance**: All items in an order must be insured or none at all. You cannot partially insure a single package. If an order is insured, the user must declare all items and their values inside that package.
- **Manual AI Trigger Only**: Pre-emptive automatic AI guessing of items/prices during intake is not allowed. AI assistance for insurance must be explicitly triggered by the user within the fulfillment wizard.

# Known context
- Insurance requires explicit user opt-in for the entire order.
- The insurance fee calculation is `0.2% * item price`.
- Item categories include common shipping categories (Document, Electronic, Fashion, Food, etc.).
- There is a CSV file (`Artifacts/Products/item category.csv`) that acts as the source of truth for these categories (containing `code_category`, `category_id` (Indonesian), `category_en` (English)).

# Risks
- Users might find it tedious to fill out extra fields, slowing down the order creation process.
- Re-entering the same item multiple times for different categories creates friction.
- The Fulfillment Wizard UI could become very complex if an order contains many different items requiring insurance.

# Options
1. **Dynamic Item List in Wizard with Manual AI Assist**: In the Fulfillment Wizard, when "Add Insurance" is toggled ON, surface a dynamic list of "Insured Items". 
   - By default, show one empty row with `Category` dropdown and `Price` input.
   - Include a "Fill with AI" button. When clicked by the user, the app runs the LLM parser against the original order text (e.g., the WhatsApp message or Excel description) to automatically extract all item categories and their prices, then populates the dynamic list accordingly.
   - Users can still manually click "+ Add another insured item" to declare additional item types within the same order if the AI misses something or if they prefer doing it manually.
   - The total insurance fee is the sum of `(0.2% * Item Price)` for all rows.
   - *Pros*: Keeps the intake pure. Solves the complex multi-item vendor requirement. Enforces the "all or nothing" insurance constraint. Gives the user total control over when AI runs, reducing unexpected behavior while remaining extremely frictionless when they want assistance.

# Recommendation
We recommend **Option 1 (Dynamic Item List with Manual AI Assist)**.

In the Fulfillment Wizard, add an "Add Insurance" switch. When enabled, display an "Insured Items" section. This section starts with one row containing a Category dropdown and a Price input. Also, render a clear "Fill with AI" button (perhaps with an AI/sparkle icon).

If the user clicks "Fill with AI", we call the LLM explicitly to parse the item names, map them to the 15 predefined categories, extract their prices from the raw input payload, and populate the dynamic item list with the results in a snap. The user can then review, edit, add, or remove items to ensure the entire package contents are accurately declared. Calculate the total insurance fee in real-time by summing the 0.2% fee across all rows.

# Acceptance criteria
- [ ] Users can toggle "Add Insurance" on and off per order within the Fulfillment Wizard.
- [ ] When toggled ON, an "Insured Items" section appears with at least one empty item entry, and a "Fill with AI" action button.
- [ ] Clicking "Fill with AI" actively calls the parser against the original item description/raw text and populates the list of items/categories/prices.
- [ ] Users can manually add multiple insured item entries to a single order.
- [ ] Users can manually remove insured item entries.
- [ ] Each item entry requires an "Item Category" and "Item Price".
- [ ] "Total Insurance Fee" is automatically calculated and shown as `Sum(0.2% * Item Price for each entry)`.
- [ ] The "Item Category" dropdown uses the 15 predefined categories.
- [ ] "Item Price" inputs format correctly for IDR.
- [ ] If toggled OFF, the "Insured Items" section is securely hidden and validation correctly ignores these fields.
