# MCR Costing & Quotation System - Static Offline Version

## Run
Open `index.html` directly in Chrome or Edge.

## Demo Users
- suhib / admin123
- fatema / manager123
- abeer / viewer123

## What was updated in this version
- Added **Number of Days**
- Changed logic to **Hours per Day** + **Daily Rate × Number of Days**
- Fixed the typing issue by removing re-render on every keystroke
- Darker dropdowns and inputs
- `Regional GB / Hour` is now **auto-calculated from bitrate and destination path**
- Improved quotation layout
- Live total now follows project logic:
  - Total per hour
  - Daily rate
  - Daily rate × number of days
  - Optional margin

## Destination Path Logic
- Internet Delivery = all outbound bandwidth goes to internet rate
- Regional / AWS Delivery = all outbound bandwidth goes to regional rate
- Hybrid Split = 50% internet + 50% regional

## Notes
This version stores session and draft data in the browser using localStorage.
