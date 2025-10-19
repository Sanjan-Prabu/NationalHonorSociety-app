# Category Box Colors Update

## Changes Made

### Brought Back Category Boxes
- Restored the box styling around each category option in CreateEventScreen
- Each category now has a colored box that matches its tag color
- Boxes change color when selected vs unselected

### Color Scheme for Category Boxes

#### Fundraiser (Green)
- **Unselected**: Light gray background `#F9FAFB` with light green border `#EBF8F2`
- **Selected**: Light green background `#EBF8F2` with green border `#48BB78`

#### Volunteering (Teal)  
- **Unselected**: Light gray background `#F9FAFB` with light teal border `#E6FFFA`
- **Selected**: Light teal background `#E6FFFA` with teal border `#38B2AC`

#### Education (Purple)
- **Unselected**: Light gray background `#F9FAFB` with light purple border `#F3E8FF`  
- **Selected**: Light purple background `#F3E8FF` with purple border `#9F7AEA`

#### Custom (Orange)
- **Unselected**: Light gray background `#F9FAFB` with light orange border `#FEF5E7`
- **Selected**: Light orange background `#FEF5E7` with orange border `#ECC94B`

### Implementation Details

1. **Added `getCategoryBoxColors` function** that returns appropriate background and border colors based on:
   - Category variant (green, teal, purple, orange)
   - Selection state (selected vs unselected)

2. **Updated category rendering** to:
   - Use dynamic styling based on selection state
   - Apply colored backgrounds and borders
   - Maintain Tag component inside for consistent text styling

3. **Restored `categoryButton` styles** with:
   - Proper padding and dimensions (48% width for 2-column layout)
   - Border radius for rounded corners
   - 2px border width for clear visual distinction

### User Experience

- **Visual Feedback**: Users can clearly see which category is selected
- **Color Consistency**: Box colors match the tag colors that will appear on the final event
- **Accessibility**: Clear contrast between selected and unselected states
- **Layout**: Maintains 2-column grid layout with proper spacing

### Result

Officers now see colored boxes around each category option that:
✅ Show the corresponding category color
✅ Provide clear visual feedback when selected
✅ Match the final event tag colors
✅ Maintain the familiar box-based selection interface