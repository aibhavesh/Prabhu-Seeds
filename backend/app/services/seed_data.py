"""
Canonical seed data for activity_types and activity_attributes.
Source of truth: Department Activities spec (images, 52 numbered activities).

Farmer Feedback module uses: activity_number IS NOT NULL (numbered activities 1–53)
Task Creation module uses:   season-based filtering (all activity types)
"""

# ── Helpers ─────────────────────────────────────────────────────────────────


def f(key, label, ftype="text", required=True, sort=0, opts=None, ph=None):
    return {
        "field_key":    key,
        "label":        label,
        "field_type":   ftype,
        "is_required":  required,
        "sort_order":   sort,
        "options":      opts,
        "placeholder":  ph,
    }


# Option sets
yn             = {"choices": ["Y", "N"]}
packing_sizes  = {"choices": ["10 Kg", "20 Kg", "40 Kg"]}
farm_category  = {"choices": ["F1", "F2", "OP", "HY"]}
complaint_types = {"choices": ["Germination", "Short Weight", "Fruiting", "Physical Appearance"]}


# ── Common field groups ──────────────────────────────────────────────────────

def mkt_location(start=1):
    """Market, Village, Tehsil, District, State."""
    s = start
    return [
        f("market",   "Market",   sort=s),
        f("village",  "Village",  sort=s + 1),
        f("tehsil",   "Tehsil",   sort=s + 2),
        f("district", "District", sort=s + 3),
        f("state",    "State",    sort=s + 4),
    ]


def mkt_farmer(start=1):
    """Farmer Name, Contact No., Land (Acres)."""
    s = start
    return [
        f("farmer_name", "Farmer Name",  sort=s),
        f("contact",     "Contact No.",  sort=s + 1),
        f("land_acres",  "Land (Acres)", ftype="decimal", sort=s + 2, required=False),
    ]


def kharif_rabi(start=1):
    """Major 3 Kharif Crops + Major 3 Rabi Crops."""
    s = start
    return [
        f("kharif_crop_1", "Kharif Crop 1", sort=s,     required=False),
        f("kharif_crop_2", "Kharif Crop 2", sort=s + 1, required=False),
        f("kharif_crop_3", "Kharif Crop 3", sort=s + 2, required=False),
        f("rabi_crop_1",   "Rabi Crop 1",   sort=s + 3, required=False),
        f("rabi_crop_2",   "Rabi Crop 2",   sort=s + 4, required=False),
        f("rabi_crop_3",   "Rabi Crop 3",   sort=s + 5, required=False),
    ]


def mkt_crop_contact(start=1):
    """Crop, Product, Farmer, Market, Tehsil, District, State, Contact No."""
    s = start
    return [
        f("crop",       "Crop",       sort=s),
        f("product",    "Product",    sort=s + 1),
        f("farmer_name","Farmer Name",sort=s + 2),
        f("market",     "Market",     sort=s + 3),
        f("tehsil",     "Tehsil",     sort=s + 4),
        f("district",   "District",   sort=s + 5),
        f("state",      "State",      sort=s + 6),
        f("contact",    "Contact No.",sort=s + 7),
    ]


def prod_base(start=1):
    """Production dept base: Crop, Product, Farmer, Village, Tehsil, District, Contact."""
    s = start
    return [
        f("crop",         "Crop",        sort=s),
        f("product",      "Product",     sort=s + 1),
        f("farmer_name",  "Farmer Name", sort=s + 2),
        f("village",      "Village",     sort=s + 3),
        f("tehsil",       "Tehsil",      sort=s + 4),
        f("district",     "District",    sort=s + 5),
        f("contact",      "Contact No.", sort=s + 6),
    ]


def rd_base(start=1):
    """R&D dept base: Crop, Product, R&D Location, Village, Tehsil, District."""
    s = start
    return [
        f("crop",        "Crop",         sort=s),
        f("product",     "Product",      sort=s + 1),
        f("rd_location", "R&D Location", sort=s + 2),
        f("village",     "Village",      sort=s + 3),
        f("tehsil",      "Tehsil",       sort=s + 4),
        f("district",    "District",     sort=s + 5),
    ]


# ── Activity Types Seed ──────────────────────────────────────────────────────
#
# activity_number IS NOT NULL  → shown in Farmer Feedback module (numbered list)
# activity_number IS NULL      → task-creation activities only (season filter)

SEED_ACTIVITY_TYPES = [

    # ── Marketing · Numbered (Farmer Feedback + Task Creation) ──────────────
    # 1 & 2 combined as one form entry, activity_number = 1
    {"name": "Farmer Meeting / Individual Contact", "department": "Marketing", "season": "Pre-Season",    "activity_number": 1},
    {"name": "Postering",                           "department": "Marketing", "season": "Pre-Season",    "activity_number": 3},
    {"name": "Jeep Campaign",                       "department": "Marketing", "season": "Pre-Season",    "activity_number": 4},
    # 5 & 6 combined
    {"name": "Rikshwa / Auto / Bike Campaign",      "department": "Marketing", "season": "Pre-Season",    "activity_number": 5},
    {"name": "Mega Farmer Meeting",                 "department": "Marketing", "season": "Pre-Season",    "activity_number": 7},
    {"name": "New Product Demonstration",           "department": "Marketing", "season": "Pre-Season",    "activity_number": 8},
    {"name": "Dealer Visit",                        "department": "Marketing", "season": "Always Active", "activity_number": 9},
    {"name": "Dealer Meeting",                      "department": "Marketing", "season": "Always Active", "activity_number": 10},
    {"name": "Marketing Staff Meeting",             "department": "Marketing", "season": "Always Active", "activity_number": 11},
    {"name": "Field Staff Meeting",                 "department": "Marketing", "season": "Always Active", "activity_number": 12},
    {"name": "Other Campaign / Krishi Mela",        "department": "Marketing", "season": "Always Active", "activity_number": 13},
    {"name": "Retailer Product Wise Sale",          "department": "Marketing", "season": "Post-Season",   "activity_number": 14},
    {"name": "Dealer Product Wise Farmer List",     "department": "Marketing", "season": "Post-Season",   "activity_number": 15},
    # 16 & 17 combined
    {"name": "Crop Show / Mega Crop Show",          "department": "Marketing", "season": "Post-Season",   "activity_number": 16},
    {"name": "Dealer Field Visit",                  "department": "Marketing", "season": "Post-Season",   "activity_number": 18},
    {"name": "Plot Visit",                          "department": "Marketing", "season": "Post-Season",   "activity_number": 19},
    {"name": "Model Plot Visit",                    "department": "Marketing", "season": "Post-Season",   "activity_number": 20},
    {"name": "Complaint Handling",                  "department": "Marketing", "season": "Always Active", "activity_number": 21},
    {"name": "Live Plant / Fruit Display",          "department": "Marketing", "season": "Post-Season",   "activity_number": 22},
    # 23 & 24 combined
    {"name": "Trial New Product / R&D Trails",      "department": "Marketing", "season": "Post-Season",   "activity_number": 23},
    {"name": "Testimonial Collection",              "department": "Marketing", "season": "Post-Season",   "activity_number": 25},
    {"name": "Dealer / Wall / Trolly / Shop Painting", "department": "Marketing", "season": "Post-Season", "activity_number": 26},

    # ── Production · Numbered (Farmer Feedback + Task Creation) ────────────
    {"name": "Foundation Seed Distribution",        "department": "Production", "season": "Pre-Season",    "activity_number": 27},
    {"name": "Farmers Field Visit",                 "department": "Production", "season": "Post-Season",   "activity_number": 28},
    {"name": "Field Inspection Report",             "department": "Production", "season": "Post-Season",   "activity_number": 29},
    {"name": "Roughing",                            "department": "Production", "season": "Post-Season",   "activity_number": 30},
    {"name": "De-Tasseling",                        "department": "Production", "season": "Post-Season",   "activity_number": 31},
    {"name": "Crossing / Pollination",              "department": "Production", "season": "Post-Season",   "activity_number": 32},
    {"name": "Crossing / Caping",                   "department": "Production", "season": "Post-Season",   "activity_number": 33},
    {"name": "Harvesting",                          "department": "Production", "season": "Post-Season",   "activity_number": 34},
    {"name": "Transport / Storage",                 "department": "Production", "season": "Post-Season",   "activity_number": 35},
    {"name": "Seed Available Details for Payment",  "department": "Production", "season": "Post-Season",   "activity_number": 36},
    {"name": "Data to be Recorded (Observations)",  "department": "Production", "season": "Post-Season",   "activity_number": 37},
    # Unnumbered (task-creation only for Production staff)
    {"name": "Complaint Handling",                  "department": "Production", "season": "Always Active"},
    {"name": "Marketing Staff Meeting",             "department": "Production", "season": "Always Active"},
    {"name": "Field Staff Meeting",                 "department": "Production", "season": "Always Active"},
    {"name": "Other Campaign / Krishi Mela",        "department": "Production", "season": "Always Active"},

    # ── R&D · Numbered (Farmer Feedback + Task Creation) ───────────────────
    {"name": "Nursery Bed Preparation",             "department": "R&D", "season": "Pre-Season",    "activity_number": 38},
    {"name": "Sowing",                              "department": "R&D", "season": "Pre-Season",    "activity_number": 39},
    {"name": "Transplanting",                       "department": "R&D", "season": "Pre-Season",    "activity_number": 40},
    {"name": "Fertilizer Basal Dose",               "department": "R&D", "season": "Post-Season",   "activity_number": 41},
    {"name": "Roughing",                            "department": "R&D", "season": "Post-Season",   "activity_number": 42},
    {"name": "Crossing / Pollination",              "department": "R&D", "season": "Post-Season",   "activity_number": 43},
    {"name": "Caping",                              "department": "R&D", "season": "Post-Season",   "activity_number": 44},
    {"name": "Harvesting Male Lines",               "department": "R&D", "season": "Post-Season",   "activity_number": 45},
    {"name": "Harvesting Female Lines",             "department": "R&D", "season": "Post-Season",   "activity_number": 46},
    {"name": "Yield Data",                          "department": "R&D", "season": "Post-Season",   "activity_number": 47},
    {"name": "Threshing",                           "department": "R&D", "season": "Post-Season",   "activity_number": 48},
    {"name": "Storage",                             "department": "R&D", "season": "Post-Season",   "activity_number": 49},
    {"name": "GOT",                                 "department": "R&D", "season": "Post-Season",   "activity_number": 50},
    # Unnumbered (task-creation only for R&D staff)
    {"name": "Complaint Handling",                  "department": "R&D", "season": "Always Active"},
    {"name": "Marketing Staff Meeting",             "department": "R&D", "season": "Always Active"},
    {"name": "Field Staff Meeting",                 "department": "R&D", "season": "Always Active"},
    {"name": "Other Campaign / Krishi Mela",        "department": "R&D", "season": "Always Active"},

    # ── Processing · Numbered (Farmer Feedback + Task Creation) ────────────
    {"name": "Licensing Validity",                  "department": "Processing", "season": "Always Active", "activity_number": 51},
    {"name": "Seed Processing Intake",              "department": "Processing", "season": "Always Active", "activity_number": 52},
    {"name": "Seed Processing Register",            "department": "Processing", "season": "Always Active", "activity_number": 53},
]


# ── Activity Attributes Seed ─────────────────────────────────────────────────
# Key: (activity_name, department)  →  must match name+department in SEED_ACTIVITY_TYPES exactly

SEED_ACTIVITY_ATTRIBUTES = {

    # ════════════════════════════════════════════════════════════════════════
    # MARKETING  (activities 1–26)
    # ════════════════════════════════════════════════════════════════════════

    # ── #1 · Farmer Meeting / Individual Contact (covers 1 & 2) ─────────────
    ("Farmer Meeting / Individual Contact", "Marketing"): [
        f("meeting_location", "Meeting Location", sort=1),
        f("village",          "Village",          sort=2),
        f("tehsil",           "Tehsil",           sort=3),
        f("district",         "District",         sort=4),
        f("state",            "State",            sort=5),
        f("farmer_name",      "Farmer Name",      sort=6),
        f("contact",          "Contact No.",      sort=7),
        f("land_acres",       "Land (Acres)",     ftype="decimal", sort=8, required=False),
        f("kharif_crop_1",    "Kharif Crop 1",    sort=9,  required=False),
        f("kharif_crop_2",    "Kharif Crop 2",    sort=10, required=False),
        f("kharif_crop_3",    "Kharif Crop 3",    sort=11, required=False),
        f("rabi_crop_1",      "Rabi Crop 1",      sort=12, required=False),
        f("rabi_crop_2",      "Rabi Crop 2",      sort=13, required=False),
        f("rabi_crop_3",      "Rabi Crop 3",      sort=14, required=False),
    ],

    # ── #3 · Postering ──────────────────────────────────────────────────────
    ("Postering", "Marketing"): [
        f("market",          "Market Name",        sort=1),
        f("village",         "Village",            sort=2),
        f("tehsil",          "Tehsil",             sort=3),
        f("district",        "District",           sort=4),
        f("state",           "State",              sort=5),
        f("no_of_dealers",   "No. of Dealers",     ftype="number", sort=6, required=False),
        f("no_of_mandies",   "No. of Mandies",     ftype="number", sort=7, required=False),
        f("no_of_bustands",  "No. of Bustands",    ftype="number", sort=8, required=False),
        f("no_of_mandirs",   "No. of Mandirs",     ftype="number", sort=9, required=False),
        f("posters_pasted",  "No. of Posters Pasted", ftype="number", sort=10),
    ],

    # ── #4 · Jeep Campaign ──────────────────────────────────────────────────
    ("Jeep Campaign", "Marketing"): mkt_location() + [
        f("farmer_name",  "Farmer Name",  sort=6),
        f("contact",      "Contact No.",  sort=7),
        f("land_acres",   "Land (Acres)", ftype="decimal", sort=8, required=False),
    ] + kharif_rabi(start=9),

    # ── #5 · Rikshwa / Auto / Bike Campaign (covers 5 & 6) ──────────────────
    ("Rikshwa / Auto / Bike Campaign", "Marketing"): mkt_location() + [
        f("no_of_dealers",  "No. of Dealers",  ftype="number", sort=6, required=False),
        f("no_of_mandies",  "No. of Mandies",  ftype="number", sort=7, required=False),
        f("no_of_bustands", "No. of Bustands", ftype="number", sort=8, required=False),
        f("no_of_mandirs",  "No. of Mandirs",  ftype="number", sort=9, required=False),
    ],

    # ── #7 · Mega Farmer Meeting ─────────────────────────────────────────────
    ("Mega Farmer Meeting", "Marketing"): mkt_location() + [
        f("farmer_name",  "Farmer Name",  sort=6),
        f("contact",      "Contact No.",  sort=7),
        f("land_acres",   "Land (Acres)", ftype="decimal", sort=8, required=False),
    ] + kharif_rabi(start=9),

    # ── #8 · New Product Demonstration ──────────────────────────────────────
    ("New Product Demonstration", "Marketing"): mkt_location() + [
        f("farmer_name",  "Farmer Name",  sort=6),
        f("contact",      "Contact No.",  sort=7),
        f("product_name", "Product Name", sort=8),
    ],

    # ── #9 · Dealer Visit ────────────────────────────────────────────────────
    ("Dealer Visit", "Marketing"): [
        f("dealer_name",       "Dealer Name",              sort=1),
        f("market",            "Market",                   sort=2),
        f("tehsil",            "Tehsil",                   sort=3),
        f("district",          "District",                 sort=4),
        f("state",             "State",                    sort=5),
        f("contact",           "Contact No.",              sort=6),
        f("collection",        "Collection",               ftype="decimal", sort=7, required=False),
        f("order",             "Order",                    ftype="decimal", sort=8, required=False),
        f("stock",             "Stock",                    ftype="decimal", sort=9, required=False),
        f("liquidation",       "Liquidation",              ftype="decimal", sort=10, required=False),
        f("market_information","Market Information",       ftype="textarea", sort=11, required=False),
    ],

    # ── #10 · Dealer Meeting ─────────────────────────────────────────────────
    ("Dealer Meeting", "Marketing"): [
        f("dealer_name",    "Dealer Name",       sort=1),
        f("market",         "Market",            sort=2),
        f("tehsil",         "Tehsil",            sort=3),
        f("district",       "District",          sort=4),
        f("state",          "State",             sort=5),
        f("contact",        "Contact No.",       sort=6),
        f("focus_product",  "Focus Product Name",sort=7),
    ],

    # ── #11 · Marketing Staff Meeting ───────────────────────────────────────
    ("Marketing Staff Meeting", "Marketing"): [
        f("no_of_staff",            "No. of Staff",                ftype="number",  sort=1),
        f("product_name",           "Product Name",                sort=2, required=False),
        f("sales_plan_current",     "Sales Plan Current",          ftype="decimal", sort=3, required=False),
        f("review_last_month",      "Review Last Month",           ftype="decimal", sort=4, required=False),
        f("shortfall_last_month",   "Shortfall Last Month",        ftype="decimal", sort=5, required=False),
        f("ytd_shortfall",          "YTD Shortfall",               ftype="decimal", sort=6, required=False),
        f("collection_current",     "Collection Current",          ftype="decimal", sort=7, required=False),
        f("collection_last_month",  "Collection Last Month",       ftype="decimal", sort=8, required=False),
        f("collection_shortfall",   "Collection Shortfall",        ftype="decimal", sort=9, required=False),
        f("collection_ytd_shortfall","Collection YTD Shortfall",   ftype="decimal", sort=10, required=False),
    ],

    # ── #12 · Field Staff Meeting ────────────────────────────────────────────
    ("Field Staff Meeting", "Marketing"): [
        f("no_of_staff",                  "No. of Staff",                    ftype="number",  sort=1),
        f("activity_review_name",         "Activity Review – Name",          sort=2,  required=False),
        f("activity_review_target",       "Activity Review – Target",        ftype="decimal", sort=3, required=False),
        f("activity_review_achieve",      "Activity Review – Achieved",      ftype="decimal", sort=4, required=False),
        f("activity_current_name",        "Activity Current – Name",         sort=5,  required=False),
        f("activity_current_target",      "Activity Current – Target",       ftype="decimal", sort=6, required=False),
        f("activity_current_achieve",     "Activity Current – Achieved",     ftype="decimal", sort=7, required=False),
        f("product_review_name",          "Product Review – Name",           sort=8,  required=False),
        f("product_review_target",        "Product Review – Target",         ftype="decimal", sort=9, required=False),
        f("product_review_achieve",       "Product Review – Achieved",       ftype="decimal", sort=10, required=False),
        f("product_current_name",         "Product Current – Name",          sort=11, required=False),
        f("product_current_target",       "Product Current – Target",        ftype="decimal", sort=12, required=False),
        f("product_current_achieve",      "Product Current – Achieved",      ftype="decimal", sort=13, required=False),
        f("collection_review_actual",     "Collection Review – Actual",      ftype="decimal", sort=14, required=False),
        f("collection_review_plan_current","Collection Review – Plan Current",ftype="decimal", sort=15, required=False),
    ],

    # ── #13 · Other Campaign / Krishi Mela ──────────────────────────────────
    ("Other Campaign / Krishi Mela", "Marketing"): [
        f("market",       "Market",          sort=1),
        f("tehsil",       "Tehsil",          sort=2),
        f("district",     "District",        sort=3),
        f("state",        "State",           sort=4),
        f("no_of_dealers","No. of Dealers",  ftype="number", sort=5, required=False),
        f("no_of_farmers","No. of Farmers",  ftype="number", sort=6, required=False),
        f("focus_products","Focus Products", sort=7, required=False),
    ],

    # ── #14 · Retailer Product Wise Sale ────────────────────────────────────
    ("Retailer Product Wise Sale", "Marketing"): [
        f("retailer_name", "Retailer Name", sort=1),
        f("product",       "Product",       sort=2),
        f("supply",        "Supply",        ftype="decimal", sort=3, required=False),
        f("stock",         "Stock",         ftype="decimal", sort=4, required=False),
        f("pog",           "POG",           ftype="decimal", sort=5, required=False),
    ],

    # ── #15 · Dealer Product Wise Farmer List ───────────────────────────────
    ("Dealer Product Wise Farmer List", "Marketing"): [
        f("dealer_name",  "Dealer",         sort=1),
        f("retailer_name","Retailer",       sort=2, required=False),
        f("product",      "Product",        sort=3),
        f("farmer_name",  "Farmer Name",    sort=4),
        f("qty_kg",       "Qty (Kg)",       ftype="decimal", sort=5),
        f("village",      "Village",        sort=6),
        f("tehsil",       "Tehsil",         sort=7),
        f("district",     "District",       sort=8),
        f("state",        "State",          sort=9),
        f("contact",      "Contact No.",    sort=10),
    ],

    # ── #16 · Crop Show / Mega Crop Show (covers 16 & 17) ───────────────────
    ("Crop Show / Mega Crop Show", "Marketing"): [
        f("crop",         "Crop",           sort=1),
        f("product",      "Product",        sort=2),
        f("farmer_name",  "Farmer Name",    sort=3),
        f("market",       "Market",         sort=4),
        f("tehsil",       "Tehsil",         sort=5),
        f("district",     "District",       sort=6),
        f("state",        "State",          sort=7),
        f("contact",      "Contact No.",    sort=8),
        f("acreage",      "Acreage",        ftype="decimal", sort=9, required=False),
    ],

    # ── #18 · Dealer Field Visit ─────────────────────────────────────────────
    ("Dealer Field Visit", "Marketing"): [
        f("crop",         "Crop",           sort=1),
        f("product",      "Product",        sort=2),
        f("dealer_name",  "Dealer Name",    sort=3),
        f("market",       "Market",         sort=4),
        f("tehsil",       "Tehsil",         sort=5),
        f("district",     "District",       sort=6),
        f("state",        "State",          sort=7),
        f("contact",      "Contact No.",    sort=8),
    ],

    # ── #19 · Plot Visit ─────────────────────────────────────────────────────
    ("Plot Visit", "Marketing"): mkt_crop_contact() + [
        f("qty_kg", "Qty (Kg)", ftype="decimal", sort=9, required=False),
    ],

    # ── #20 · Model Plot Visit ───────────────────────────────────────────────
    ("Model Plot Visit", "Marketing"): mkt_crop_contact() + [
        f("qty_kg",     "Qty (Kg)",    ftype="decimal", sort=9,  required=False),
        f("repetition", "Repetition",  ftype="number",  sort=10, required=False),
        f("crop_stage", "Crop Stage",  sort=11, required=False),
        f("condition",  "Condition",   sort=12, required=False),
    ],

    # ── #21 · Complaint Handling [Always Active] ─────────────────────────────
    ("Complaint Handling", "Marketing"): mkt_crop_contact() + [
        f("qty_kg",              "Qty (Kg)",           ftype="decimal",  sort=9,  required=False),
        f("nature_of_complaint", "Nature of Complaint",ftype="dropdown", sort=10, opts=complaint_types),
    ],

    # ── #22 · Live Plant / Fruit Display ────────────────────────────────────
    ("Live Plant / Fruit Display", "Marketing"): [
        f("crop",         "Crop",        sort=1),
        f("product",      "Product",     sort=2),
        f("dealer_name",  "Dealer Name", sort=3),
        f("market",       "Market",      sort=4),
        f("tehsil",       "Tehsil",      sort=5),
        f("district",     "District",    sort=6),
        f("state",        "State",       sort=7),
        f("contact",      "Contact No.", sort=8),
    ],

    # ── #23 · Trial New Product / R&D Trails (covers 23 & 24) ───────────────
    ("Trial New Product / R&D Trails", "Marketing"): mkt_crop_contact() + [
        f("qty_kg", "Qty (Kg)", ftype="decimal", sort=9, required=False),
    ],

    # ── #25 · Testimonial Collection ────────────────────────────────────────
    ("Testimonial Collection", "Marketing"): mkt_crop_contact(),

    # ── #26 · Dealer / Wall / Trolly / Shop Painting ────────────────────────
    ("Dealer / Wall / Trolly / Shop Painting", "Marketing"): [
        f("crop",        "Crop",        sort=1),
        f("product",     "Product",     sort=2),
        f("dealer_name", "Dealer Name", sort=3),
        f("market",      "Market",      sort=4),
        f("tehsil",      "Tehsil",      sort=5),
        f("district",    "District",    sort=6),
        f("state",       "State",       sort=7),
        f("contact",     "Contact No.", sort=8),
    ],

    # ════════════════════════════════════════════════════════════════════════
    # PRODUCTION  (activities 27–37)
    # ════════════════════════════════════════════════════════════════════════

    # ── #27 · Foundation Seed Distribution ──────────────────────────────────
    ("Foundation Seed Distribution", "Production"): prod_base() + [
        f("qty_quintals",          "Qty (Quintals)",                     ftype="decimal", sort=8),
        f("sowing_date",           "Sowing Date",                        ftype="date",    sort=9),
        f("transplanting_date",    "Transplanting Date",                 ftype="date",    sort=10, required=False),
        f("germination_pct",       "Germination %",                      ftype="decimal", sort=11, required=False),
        f("acreage",               "Acreage",                            ftype="decimal", sort=12),
        f("total_yield",           "Total Yield",                        ftype="decimal", sort=13, required=False),
        f("production_agreement",  "Production Agreement (Y/N)",         ftype="radio",   sort=14, opts=yn),
        f("farmer_bill_filing",    "Farmer Bill Filing (Y/N)",           ftype="radio",   sort=15, opts=yn),
        f("b1_photo_copy",         "Farmers B-1 Photo Copy / File Status", ftype="radio", sort=16, opts=yn),
    ],

    # ── #28 · Farmers Field Visit ────────────────────────────────────────────
    ("Farmers Field Visit", "Production"): prod_base() + [
        f("date",               "Date",                        ftype="date",    sort=8),
        f("crop_stage",         "Crop Stage",                  sort=9, required=False),
        f("rec_weedicide",      "Recommendation: Weedicide",   sort=10, required=False),
        f("rec_weedicide_dose", "Weedicide Dose",              sort=11, required=False),
        f("rec_pesticide",      "Recommendation: Pesticide",   sort=12, required=False),
        f("rec_pesticide_dose", "Pesticide Dose",              sort=13, required=False),
        f("rec_fertilizer",     "Recommendation: Fertilizer",  sort=14, required=False),
        f("rec_fertilizer_dose","Fertilizer Dose",             sort=15, required=False),
    ],

    # ── #29 · Field Inspection Report ───────────────────────────────────────
    ("Field Inspection Report", "Production"): prod_base() + [
        f("date_of_sowing",        "Date of Sowing",             ftype="date",     sort=8),
        f("date_of_visit",         "Date of Visit",              ftype="date",     sort=9),
        f("farmer_reg_no",         "Farmer Registration No.",    sort=10),
        f("category_of_farm_seed", "Category of Farm Seed",      ftype="dropdown", sort=11, opts=farm_category),
        f("acreage",               "Acreage",                    ftype="decimal",  sort=12),
    ],

    # ── #30 · Roughing ──────────────────────────────────────────────────────
    ("Roughing", "Production"): prod_base() + [
        f("date",          "Date",             ftype="date",    sort=8),
        f("acreage",       "Acreage",          ftype="decimal", sort=9),
        f("no_of_labours", "No. of Labourers", ftype="number",  sort=10),
    ],

    # ── #31 · De-Tasseling ──────────────────────────────────────────────────
    ("De-Tasseling", "Production"): prod_base() + [
        f("date",          "Date",             ftype="date",    sort=8),
        f("acreage",       "Acreage",          ftype="decimal", sort=9),
        f("no_of_labours", "No. of Labourers", ftype="number",  sort=10),
    ],

    # ── #32 · Crossing / Pollination ────────────────────────────────────────
    ("Crossing / Pollination", "Production"): prod_base() + [
        f("date",          "Date",             ftype="date",    sort=8),
        f("acreage",       "Acreage",          ftype="decimal", sort=9),
        f("no_of_labours", "No. of Labourers", ftype="number",  sort=10),
    ],

    # ── #33 · Crossing / Caping ─────────────────────────────────────────────
    ("Crossing / Caping", "Production"): prod_base() + [
        f("date",          "Date",             ftype="date",    sort=8),
        f("acreage",       "Acreage",          ftype="decimal", sort=9),
        f("no_of_labours", "No. of Labourers", ftype="number",  sort=10),
    ],

    # ── #34 · Harvesting ────────────────────────────────────────────────────
    ("Harvesting", "Production"): prod_base() + [
        f("date",             "Date",                   ftype="date",    sort=8),
        f("acreage",          "Acreage",                ftype="decimal", sort=9),
        f("no_of_labours",    "No. of Labourers",       ftype="number",  sort=10),
        f("yield_qt",         "Yield (Qt)",             ftype="decimal", sort=11),
        f("final_yield_qt",   "Final Yield (Qt)",       ftype="decimal", sort=12),
        f("no_of_gunny_bags", "No. of Gunny Bags Used", ftype="number",  sort=13),
    ],

    # ── #35 · Transport / Storage ───────────────────────────────────────────
    ("Transport / Storage", "Production"): prod_base() + [
        f("date",              "Date",              ftype="date",    sort=8),
        f("acreage",           "Acreage",           ftype="decimal", sort=9),
        f("no_of_labours",     "No. of Labourers",  ftype="number",  sort=10),
        f("final_yield_qt",    "Final Yield (Qt)",  ftype="decimal", sort=11),
        f("warehouse_name",    "Warehouse Name",    sort=12, required=False),
        f("cold_storage_name", "Cold Storage Name", sort=13, required=False),
        f("moisture_pct",      "Moisture %",        ftype="decimal", sort=14, required=False),
    ],

    # ── #36 · Seed Available Details for Payment ────────────────────────────
    ("Seed Available Details for Payment", "Production"): prod_base() + [
        f("date",            "Date",               ftype="date",    sort=8),
        f("yield_qt",        "Yield (Qt)",         ftype="decimal", sort=9),
        f("deduction",       "Deduction if Any",   ftype="decimal", sort=10, required=False),
        f("rate_per_qt",     "Rate per Qt",        ftype="decimal", sort=11),
        f("net_payable_amt", "Net Payable Amount", ftype="decimal", sort=12),
    ],

    # ── #37 · Data to be Recorded (Observations) ────────────────────────────
    ("Data to be Recorded (Observations)", "Production"): prod_base() + [
        f("sowing_date",        "Sowing Date",        ftype="date",    sort=8),
        f("transplanting_date", "Transplanting Date", ftype="date",    sort=9,  required=False),
        f("germination_pct",    "Germination %",      ftype="decimal", sort=10, required=False),
        f("tillers_per_metre",  "Tillers/Metre",      ftype="decimal", sort=11, required=False),
        f("plant_height_cm",    "Plant Height (cm)",  ftype="decimal", sort=12, required=False),
        f("grains_earhead",     "Grains/Earhead",     ftype="decimal", sort=13, required=False),
        f("seeds_per_cob",      "Seeds/Cob",          ftype="decimal", sort=14, required=False),
        f("seed_weight",        "Seed Weight",        ftype="decimal", sort=15, required=False),
        f("shelling_pct",       "Shelling %",         ftype="decimal", sort=16, required=False),
        f("cooking_quality",    "Cooking Quality",    sort=17, required=False),
        f("lodging_pct",        "Lodging %",          ftype="decimal", sort=18, required=False),
    ],

    # ════════════════════════════════════════════════════════════════════════
    # R&D  (activities 38–50)
    # ════════════════════════════════════════════════════════════════════════

    # ── #38 · Nursery Bed Preparation ───────────────────────────────────────
    ("Nursery Bed Preparation", "R&D"): rd_base() + [
        f("date",    "Date",           ftype="date",    sort=7),
        f("acreage", "No. of Acreage", ftype="decimal", sort=8),
    ],

    # ── #39 · Sowing ────────────────────────────────────────────────────────
    ("Sowing", "R&D"): rd_base() + [
        f("date",    "Date",           ftype="date",    sort=7),
        f("acreage", "No. of Acreage", ftype="decimal", sort=8),
    ],

    # ── #40 · Transplanting ─────────────────────────────────────────────────
    ("Transplanting", "R&D"): rd_base() + [
        f("date",    "Date",           ftype="date",    sort=7),
        f("acreage", "No. of Acreage", ftype="decimal", sort=8),
    ],

    # ── #41 · Fertilizer Basal Dose ─────────────────────────────────────────
    ("Fertilizer Basal Dose", "R&D"): rd_base() + [
        f("date",           "Date",                   ftype="date",    sort=7),
        f("bd_dap",         "Basal Dose – DAP",       ftype="decimal", sort=8,  required=False),
        f("bd_urea",        "Basal Dose – Urea",      ftype="decimal", sort=9,  required=False),
        f("bd_mop",         "Basal Dose – MOP",       ftype="decimal", sort=10, required=False),
        f("bd_qty",         "Basal Dose – Qty",       ftype="decimal", sort=11, required=False),
        f("d2_dap",         "2nd Dose – DAP",         ftype="decimal", sort=12, required=False),
        f("d2_urea",        "2nd Dose – Urea",        ftype="decimal", sort=13, required=False),
        f("d2_mop",         "2nd Dose – MOP",         ftype="decimal", sort=14, required=False),
        f("d2_zinc",        "2nd Dose – Zinc",        ftype="decimal", sort=15, required=False),
        f("d2_microhyza",   "2nd Dose – Microhyza",   ftype="decimal", sort=16, required=False),
        f("d2_qty",         "2nd Dose – Qty",         ftype="decimal", sort=17, required=False),
        f("d3_dose",        "3rd Dose",               ftype="text",    sort=18, required=False),
        f("d3_qty",         "3rd Dose – Qty",         ftype="decimal", sort=19, required=False),
    ],

    # ── #42 · Roughing ──────────────────────────────────────────────────────
    ("Roughing", "R&D"): rd_base() + [
        f("date",    "Date",    ftype="date",    sort=7),
        f("acreage", "Acreage", ftype="decimal", sort=8),
    ],

    # ── #43 · Crossing / Pollination ────────────────────────────────────────
    ("Crossing / Pollination", "R&D"): rd_base() + [
        f("date",    "Date",    ftype="date",    sort=7),
        f("acreage", "Acreage", ftype="decimal", sort=8),
    ],

    # ── #44 · Caping ────────────────────────────────────────────────────────
    ("Caping", "R&D"): rd_base() + [
        f("date",    "Date",    ftype="date",    sort=7),
        f("acreage", "Acreage", ftype="decimal", sort=8),
    ],

    # ── #45 · Harvesting Male Lines ─────────────────────────────────────────
    ("Harvesting Male Lines", "R&D"): rd_base() + [
        f("date",              "Date",              ftype="date",    sort=7),
        f("acreage",           "Acreage",           ftype="decimal", sort=8),
        f("yield_qty_qt",      "Yield Qty (Qt)",    ftype="decimal", sort=9),
        f("warehouse_name",    "Warehouse Name",    sort=10, required=False),
        f("cold_storage_name", "Cold Storage Name", sort=11, required=False),
    ],

    # ── #46 · Harvesting Female Lines ───────────────────────────────────────
    ("Harvesting Female Lines", "R&D"): rd_base() + [
        f("date",              "Date",              ftype="date",    sort=7),
        f("acreage",           "Acreage",           ftype="decimal", sort=8),
        f("yield_qty_qt",      "Yield Qty (Qt)",    ftype="decimal", sort=9),
        f("warehouse_name",    "Warehouse Name",    sort=10, required=False),
        f("cold_storage_name", "Cold Storage Name", sort=11, required=False),
    ],

    # ── #47 · Yield Data ────────────────────────────────────────────────────
    ("Yield Data", "R&D"): rd_base() + [
        f("date",         "Date",         ftype="date",    sort=7),
        f("acreage",      "Acreage",      ftype="decimal", sort=8),
        f("yield_qt",     "Yield (Qt)",   ftype="decimal", sort=9),
        f("warehouse",    "Warehouse",    sort=10, required=False),
        f("cold_storage", "Cold Storage", sort=11, required=False),
    ],

    # ── #48 · Threshing ─────────────────────────────────────────────────────
    ("Threshing", "R&D"): rd_base() + [
        f("date",         "Date",         ftype="date",    sort=7),
        f("acreage",      "Acreage",      ftype="decimal", sort=8),
        f("yield_qt",     "Yield (Qt)",   ftype="decimal", sort=9),
        f("warehouse",    "Warehouse",    sort=10, required=False),
        f("cold_storage", "Cold Storage", sort=11, required=False),
    ],

    # ── #49 · Storage ───────────────────────────────────────────────────────
    ("Storage", "R&D"): rd_base() + [
        f("date",         "Date",         ftype="date",    sort=7),
        f("acreage",      "Acreage",      ftype="decimal", sort=8),
        f("yield_qt",     "Yield (Qt)",   ftype="decimal", sort=9),
        f("warehouse",    "Warehouse",    sort=10, required=False),
        f("cold_storage", "Cold Storage", sort=11, required=False),
    ],

    # ── #50 · GOT ───────────────────────────────────────────────────────────
    ("GOT", "R&D"): rd_base() + [
        f("date",               "Date",               ftype="date",    sort=7),
        f("sowing_date",        "Sowing Date",        ftype="date",    sort=8),
        f("transplanting_date", "Transplanting Date", ftype="date",    sort=9,  required=False),
        f("germination_pct",    "Germination %",      ftype="decimal", sort=10, required=False),
        f("actual_seed_pct",    "Actual Seed %",      ftype="decimal", sort=11, required=False),
        f("off_type_plant_pct", "Off-Type Plant %",   ftype="decimal", sort=12, required=False),
        f("final_result",       "Final Result",       sort=13, required=False),
    ],

    # ════════════════════════════════════════════════════════════════════════
    # PROCESSING  (activities 51–53)
    # ════════════════════════════════════════════════════════════════════════

    # ── #51 · Licensing Validity ─────────────────────────────────────────────
    ("Licensing Validity", "Processing"): [
        f("valid_seed_license",    "Valid Seed License",                 sort=1),
        f("organiser_name",        "Name of Organiser",                  sort=2),
        f("license_validity_date", "License Validity Date", ftype="date", sort=3),
        f("pc_endorsement",        "Our PC Endorsement in their License", ftype="radio", sort=4, opts=yn),
    ],

    # ── #52 · Seed Processing Intake ────────────────────────────────────────
    ("Seed Processing Intake", "Processing"): [
        f("crop",            "Crop",            sort=1),
        f("variety",         "Variety",         sort=2),
        f("production_code", "Production Code", sort=3),
        f("grower",          "Grower",          sort=4),
        f("village",         "Village",         sort=5),
        f("district",        "District",        sort=6),
        f("state",           "State",           sort=7),
        f("date_of_receipt", "Date of Receipt", ftype="date",    sort=8),
        f("moisture_pct",    "Moisture %",      ftype="decimal", sort=9,  required=False),
        f("no_of_bags",      "No. of Bags",     ftype="number",  sort=10),
        f("total_weight",    "Total Weight",    ftype="decimal", sort=11),
        f("allotted_lot_no", "Allotted Lot No.",sort=12),
        f("unprocessed_qty", "Unprocessed Qty", ftype="decimal", sort=13, required=False),
        f("processed_qty",   "Processed Qty",   ftype="decimal", sort=14, required=False),
        f("rejected_seeds",  "Rejected Seeds",  ftype="decimal", sort=15, required=False),
        f("result",          "Result",          sort=16, required=False),
    ],

    # ── #53 · Seed Processing Register ──────────────────────────────────────
    ("Seed Processing Register", "Processing"): [
        f("sr_no",                  "Sr. No.",                ftype="number",   sort=1),
        f("crop",                   "Crop",                   sort=2),
        f("variety",                "Variety",                sort=3),
        f("lot_no",                 "Lot No.",                sort=4),
        f("graded_seeds_qty_kg",    "Graded Seeds Qty (Kg)",  ftype="decimal",  sort=5),
        f("pkd_qty",                "PKD Qty",                ftype="decimal",  sort=6,  required=False),
        f("packing_size",           "Packing Size",           ftype="dropdown", sort=7,  opts=packing_sizes, required=False),
        f("no_of_packets",          "No. of Packets",         ftype="number",   sort=8,  required=False),
        f("date_of_packing",        "Date of Packing",        ftype="date",     sort=9,  required=False),
        f("label_nos_from",         "Label Nos From",         sort=10, required=False),
        f("label_nos_to",           "Label Nos To",           sort=11, required=False),
        f("missing_labels",         "Missing Labels",         ftype="number",   sort=12, required=False),
        f("total_labels",           "Total Labels",           ftype="number",   sort=13, required=False),
        f("difference_hn",          "Difference H-N",         ftype="number",   sort=14, required=False),
        f("opening_hologram_no",    "Opening Hologram No.",   sort=15, required=False),
        f("closing_hologram_no",    "Closing Hologram No.",   sort=16, required=False),
        f("missing_hologram",       "Missing Hologram",       ftype="number",   sort=17, required=False),
        f("total_issued_hologram",  "Total Issued Hologram",  ftype="number",   sort=18, required=False),
        f("remarks",                "Remarks",                ftype="textarea", sort=19, required=False),
        f("date_of_grading",        "Date of Grading",        ftype="date",     sort=20, required=False),
        f("mos_pct",                "Mos%",                   ftype="decimal",  sort=21, required=False),
        f("no_of_bags",             "No. of Bags",            ftype="number",   sort=22, required=False),
        f("total_weight",           "Total Weight",           ftype="decimal",  sort=23, required=False),
        f("processed_seeds_qty",    "Processed Seeds Qty",    ftype="decimal",  sort=24, required=False),
        f("shortage_wt",            "Shortage Wt.",           ftype="decimal",  sort=25, required=False),
        f("got_germination_pct",    "GOT Germination %",      ftype="decimal",  sort=26, required=False),
    ],
}
