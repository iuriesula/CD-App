import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";

// Approximate coordinates for major US zip code regions (first 3 digits)
// This is a simplified approach - in production, use a proper geocoding service
const zipRegions: Record<string, { lat: number; lng: number }> = {
  // === TERRITORIES ===
  "005": { lat: 18.4655, lng: -66.1057 }, // Puerto Rico
  "006": { lat: 18.4655, lng: -66.1057 }, // Puerto Rico (San Juan)
  "007": { lat: 18.4655, lng: -66.1057 }, // Puerto Rico
  "008": { lat: 18.2208, lng: -65.9544 }, // US Virgin Islands
  "009": { lat: 18.3412, lng: -64.9307 }, // US Virgin Islands

  // === MASSACHUSETTS (additional) ===
  "014": { lat: 42.4845, lng: -71.5250 }, // Fitchburg MA
  "020": { lat: 42.0834, lng: -71.0200 }, // Brockton MA
  "026": { lat: 41.7370, lng: -70.6163 }, // Buzzards Bay MA
  "027": { lat: 41.6688, lng: -70.2962 }, // Cape Cod MA

  // === RHODE ISLAND ===
  "028": { lat: 41.8240, lng: -71.4128 }, // Providence RI
  "029": { lat: 41.8240, lng: -71.4128 }, // Providence RI

  // === NEW HAMPSHIRE ===
  "030": { lat: 42.9956, lng: -71.4548 }, // Manchester NH
  "031": { lat: 42.9956, lng: -71.4548 }, // Manchester NH
  "032": { lat: 42.9956, lng: -71.4548 }, // Manchester NH
  "033": { lat: 43.2081, lng: -71.5376 }, // Concord NH
  "034": { lat: 43.2081, lng: -71.5376 }, // Concord NH
  "035": { lat: 42.7654, lng: -71.4676 }, // Nashua NH
  "036": { lat: 43.4697, lng: -71.2627 }, // Laconia NH
  "037": { lat: 44.2706, lng: -71.3033 }, // White Mtns NH
  "038": { lat: 42.9329, lng: -72.2756 }, // Keene NH

  // === MAINE ===
  "039": { lat: 43.0722, lng: -70.7626 }, // Kittery ME
  "040": { lat: 43.6591, lng: -70.2568 }, // Portland ME
  "041": { lat: 43.6591, lng: -70.2568 }, // Portland ME
  "042": { lat: 43.6591, lng: -70.2568 }, // Portland ME
  "043": { lat: 44.3106, lng: -69.7795 }, // Augusta ME
  "044": { lat: 44.8016, lng: -68.7712 }, // Bangor ME
  "045": { lat: 43.4925, lng: -70.4514 }, // Biddeford ME
  "046": { lat: 44.5521, lng: -69.6317 }, // Waterville ME
  "047": { lat: 44.0978, lng: -70.2312 }, // Lewiston ME
  "048": { lat: 46.6801, lng: -68.0156 }, // Presque Isle ME
  "049": { lat: 44.3106, lng: -69.7795 }, // Augusta ME

  // === VERMONT ===
  "050": { lat: 44.2601, lng: -72.5754 }, // Montpelier VT
  "051": { lat: 43.6106, lng: -72.9726 }, // Bellows Falls VT
  "052": { lat: 42.8509, lng: -72.5579 }, // Brattleboro VT
  "053": { lat: 44.4759, lng: -73.2121 }, // Burlington VT
  "054": { lat: 44.4759, lng: -73.2121 }, // Burlington VT
  "055": { lat: 44.4759, lng: -73.2121 }, // Burlington VT
  "056": { lat: 44.4759, lng: -73.2121 }, // Burlington VT
  "057": { lat: 43.6106, lng: -72.9726 }, // Rutland VT
  "058": { lat: 44.4189, lng: -72.0145 }, // St Johnsbury VT
  "059": { lat: 43.6485, lng: -72.3185 }, // White River Jct VT

  // === NEW JERSEY ===
  "070": { lat: 40.7282, lng: -74.0776 }, // Newark NJ
  "071": { lat: 40.7282, lng: -74.0776 }, // Newark NJ
  "072": { lat: 40.6649, lng: -74.2099 }, // Elizabeth NJ
  "073": { lat: 40.9168, lng: -74.1724 }, // Paterson NJ
  "074": { lat: 40.8859, lng: -74.0435 }, // Hackensack NJ
  "075": { lat: 40.8568, lng: -74.1285 }, // Passaic NJ
  "076": { lat: 40.7357, lng: -74.1724 }, // Newark NJ
  "077": { lat: 40.4168, lng: -74.0779 }, // Red Bank NJ
  "078": { lat: 40.8859, lng: -74.5624 }, // Dover NJ
  "079": { lat: 40.0960, lng: -74.2057 }, // Lakewood NJ
  "080": { lat: 39.9538, lng: -74.1979 }, // Toms River NJ
  "081": { lat: 39.9256, lng: -75.1196 }, // Camden NJ
  "082": { lat: 39.3643, lng: -74.4229 }, // Atlantic City NJ
  "083": { lat: 39.4276, lng: -75.2341 }, // Bridgeton NJ
  "084": { lat: 39.4643, lng: -74.5229 }, // Egg Harbor NJ
  "085": { lat: 40.2206, lng: -74.7697 }, // Trenton NJ
  "086": { lat: 40.2206, lng: -74.7697 }, // Trenton NJ
  "087": { lat: 40.4862, lng: -74.4518 }, // New Brunswick NJ
  "088": { lat: 40.3573, lng: -74.6672 }, // Princeton NJ
  "089": { lat: 40.4862, lng: -74.4518 }, // New Brunswick NJ

  // Northeast
  "100": { lat: 40.7128, lng: -74.006 }, // NYC
  "101": { lat: 40.7128, lng: -74.006 },
  "102": { lat: 40.7128, lng: -74.006 },
  "103": { lat: 40.6501, lng: -73.9496 },
  "104": { lat: 40.8176, lng: -73.9046 },
  "105": { lat: 40.9176, lng: -73.8546 },
  "106": { lat: 41.0534, lng: -73.7954 },
  "107": { lat: 40.9634, lng: -73.8054 },
  "108": { lat: 40.9034, lng: -74.0054 },
  "109": { lat: 41.1534, lng: -73.7954 },
  "110": { lat: 40.7834, lng: -73.6954 },
  "111": { lat: 40.7534, lng: -73.5954 },
  "112": { lat: 40.6534, lng: -73.9554 },
  "113": { lat: 40.6934, lng: -73.8554 },
  "114": { lat: 40.7034, lng: -73.7554 },
  "115": { lat: 40.7734, lng: -73.4954 },
  "116": { lat: 40.7034, lng: -73.4954 },
  "117": { lat: 40.8534, lng: -73.3954 },
  "118": { lat: 40.9534, lng: -73.2954 },
  "119": { lat: 41.0534, lng: -73.2954 },

  // === UPSTATE NEW YORK ===
  "120": { lat: 42.6526, lng: -73.7562 }, // Albany NY
  "121": { lat: 42.6526, lng: -73.7562 }, // Albany NY
  "122": { lat: 42.6526, lng: -73.7562 }, // Albany NY
  "123": { lat: 42.8142, lng: -73.9396 }, // Schenectady NY
  "124": { lat: 42.4430, lng: -76.5019 }, // Ithaca NY
  "125": { lat: 41.7009, lng: -73.9209 }, // Poughkeepsie NY
  "126": { lat: 41.7009, lng: -73.9209 }, // Poughkeepsie NY
  "127": { lat: 41.4460, lng: -74.4229 }, // Middletown NY
  "128": { lat: 42.0987, lng: -75.9180 }, // Binghamton NY
  "129": { lat: 41.3748, lng: -74.6918 }, // Port Jervis NY
  "130": { lat: 43.0481, lng: -76.1474 }, // Syracuse NY
  "131": { lat: 43.0481, lng: -76.1474 }, // Syracuse NY
  "132": { lat: 43.0481, lng: -76.1474 }, // Syracuse NY
  "133": { lat: 43.1009, lng: -75.2327 }, // Utica NY
  "134": { lat: 43.1009, lng: -75.2327 }, // Utica NY
  "135": { lat: 43.1009, lng: -75.2327 }, // Utica NY
  "136": { lat: 43.9709, lng: -75.9107 }, // Watertown NY
  "137": { lat: 43.0481, lng: -76.1474 }, // Syracuse NY
  "138": { lat: 42.0903, lng: -76.8078 }, // Elmira NY
  "139": { lat: 42.1614, lng: -76.8065 }, // Elmira NY
  "140": { lat: 42.8864, lng: -78.8784 }, // Buffalo NY
  "141": { lat: 42.8864, lng: -78.8784 }, // Buffalo NY
  "142": { lat: 42.8864, lng: -78.8784 }, // Buffalo NY
  "143": { lat: 43.1566, lng: -77.6088 }, // Rochester NY
  "144": { lat: 43.1566, lng: -77.6088 }, // Rochester NY
  "145": { lat: 43.1566, lng: -77.6088 }, // Rochester NY
  "146": { lat: 43.1566, lng: -77.6088 }, // Rochester NY
  "147": { lat: 42.0970, lng: -79.2353 }, // Jamestown NY
  "148": { lat: 42.0788, lng: -78.4297 }, // Olean NY
  "149": { lat: 42.8864, lng: -78.8784 }, // Buffalo NY

  "021": { lat: 42.3601, lng: -71.0589 }, // Boston
  "022": { lat: 42.3601, lng: -71.0589 },
  "023": { lat: 42.0834, lng: -71.0589 },
  "024": { lat: 42.4534, lng: -71.2089 },
  "025": { lat: 42.1234, lng: -70.8589 },
  "019": { lat: 42.5234, lng: -70.8589 },
  "018": { lat: 42.6234, lng: -70.9589 },
  "017": { lat: 42.4834, lng: -71.2589 },
  "016": { lat: 42.3234, lng: -71.8089 },
  "015": { lat: 42.2234, lng: -72.0089 },
  "013": { lat: 42.1034, lng: -72.5889 },
  "010": { lat: 42.1034, lng: -72.5889 },
  "011": { lat: 42.1034, lng: -72.5889 },
  "012": { lat: 42.4534, lng: -73.2589 },
  "060": { lat: 41.7658, lng: -72.6734 }, // Hartford
  "061": { lat: 41.7658, lng: -72.6734 },
  "062": { lat: 41.7658, lng: -72.6734 },
  "063": { lat: 41.2765, lng: -73.0003 },
  "064": { lat: 41.1665, lng: -73.2003 },
  "065": { lat: 41.3165, lng: -72.9203 },
  "066": { lat: 41.0565, lng: -73.5403 },
  "067": { lat: 41.5565, lng: -72.7403 },
  "068": { lat: 41.4565, lng: -72.8203 },
  "069": { lat: 41.3565, lng: -72.5203 },
  "190": { lat: 39.9526, lng: -75.1652 }, // Philadelphia
  "191": { lat: 39.9526, lng: -75.1652 },
  "192": { lat: 39.9526, lng: -75.1652 },
  "193": { lat: 39.9526, lng: -75.1652 },
  "194": { lat: 40.0526, lng: -75.2652 },
  "195": { lat: 39.8526, lng: -75.0652 },
  "196": { lat: 40.1326, lng: -75.4652 },
  "150": { lat: 40.4406, lng: -79.9959 }, // Pittsburgh
  "151": { lat: 40.4406, lng: -79.9959 },
  "152": { lat: 40.4406, lng: -79.9959 },
  "153": { lat: 40.4406, lng: -79.9959 },
  "154": { lat: 40.3406, lng: -79.8959 },
  "155": { lat: 40.2406, lng: -79.0159 },
  "156": { lat: 40.5006, lng: -78.4159 },

  // === PENNSYLVANIA (additional) ===
  "157": { lat: 40.2732, lng: -76.8867 }, // Harrisburg PA
  "158": { lat: 40.5186, lng: -78.3947 }, // Altoona PA
  "159": { lat: 40.3268, lng: -78.9220 }, // Johnstown PA
  "160": { lat: 41.4090, lng: -75.6624 }, // Scranton PA
  "161": { lat: 41.4090, lng: -75.6624 }, // Scranton PA
  "162": { lat: 41.4090, lng: -75.6624 }, // Scranton PA
  "163": { lat: 41.4090, lng: -75.6624 }, // Scranton PA
  "164": { lat: 42.1292, lng: -80.0851 }, // Erie PA
  "165": { lat: 42.1292, lng: -80.0851 }, // Erie PA
  "166": { lat: 40.5186, lng: -78.3947 }, // Altoona PA
  "167": { lat: 40.3268, lng: -78.9220 }, // Johnstown PA
  "168": { lat: 40.7934, lng: -77.8600 }, // State College PA
  "169": { lat: 41.7462, lng: -77.3007 }, // Wellsboro PA
  "170": { lat: 40.2732, lng: -76.8867 }, // Harrisburg PA
  "171": { lat: 40.2732, lng: -76.8867 }, // Harrisburg PA
  "172": { lat: 40.2732, lng: -76.8867 }, // Harrisburg PA
  "173": { lat: 40.0379, lng: -76.3055 }, // Lancaster PA
  "174": { lat: 39.9626, lng: -76.7278 }, // York PA
  "175": { lat: 40.0379, lng: -76.3055 }, // Lancaster PA
  "176": { lat: 40.0379, lng: -76.3055 }, // Lancaster PA
  "177": { lat: 39.9626, lng: -76.7278 }, // York PA
  "178": { lat: 40.3356, lng: -75.9269 }, // Reading PA
  "179": { lat: 40.3356, lng: -75.9269 }, // Reading PA
  "180": { lat: 40.6084, lng: -75.4902 }, // Allentown PA
  "181": { lat: 40.6084, lng: -75.4902 }, // Allentown PA
  "182": { lat: 41.2459, lng: -75.8813 }, // Wilkes-Barre PA
  "183": { lat: 40.6084, lng: -75.4902 }, // Lehigh Valley PA
  "184": { lat: 41.4090, lng: -75.6624 }, // Scranton PA
  "185": { lat: 41.4090, lng: -75.6624 }, // Scranton PA
  "186": { lat: 41.4090, lng: -75.6624 }, // Scranton PA
  "187": { lat: 41.2459, lng: -75.8813 }, // Wilkes-Barre PA
  "188": { lat: 41.0065, lng: -75.1940 }, // Stroudsburg PA
  "189": { lat: 41.0193, lng: -75.1826 }, // Pocono PA

  // === DELAWARE ===
  "197": { lat: 39.7391, lng: -75.5398 }, // Wilmington DE
  "198": { lat: 39.7391, lng: -75.5398 }, // Wilmington DE
  "199": { lat: 39.1582, lng: -75.5244 }, // Dover DE

  // Southeast
  "200": { lat: 38.9072, lng: -77.0369 }, // DC
  "201": { lat: 38.9072, lng: -77.0369 },
  "202": { lat: 38.9072, lng: -77.0369 },
  "203": { lat: 38.9072, lng: -77.0369 },
  "204": { lat: 38.8072, lng: -77.0369 },
  "205": { lat: 38.8072, lng: -77.0369 },
  "220": { lat: 38.8462, lng: -77.3064 }, // Northern VA
  "221": { lat: 38.8462, lng: -77.3064 },
  "222": { lat: 38.8462, lng: -77.3064 },
  "223": { lat: 38.8462, lng: -77.3064 },

  // === MARYLAND ===
  "206": { lat: 38.9072, lng: -77.0369 }, // Southern MD
  "207": { lat: 38.9784, lng: -76.4922 }, // Annapolis MD
  "208": { lat: 38.9784, lng: -76.4922 }, // Anne Arundel MD
  "209": { lat: 39.0840, lng: -77.1528 }, // Silver Spring MD
  "210": { lat: 39.2904, lng: -76.6122 }, // Baltimore MD
  "211": { lat: 39.2904, lng: -76.6122 }, // Baltimore MD
  "212": { lat: 39.2904, lng: -76.6122 }, // Baltimore MD
  "213": { lat: 39.2904, lng: -76.6122 }, // Baltimore MD
  "214": { lat: 39.2904, lng: -76.6122 }, // Baltimore MD
  "215": { lat: 39.2904, lng: -76.6122 }, // Baltimore MD
  "216": { lat: 39.4143, lng: -77.4105 }, // Frederick MD
  "217": { lat: 39.4143, lng: -77.4105 }, // Frederick MD
  "218": { lat: 38.3607, lng: -75.5994 }, // Salisbury MD
  "219": { lat: 39.6528, lng: -78.7625 }, // Cumberland MD

  // === VIRGINIA (additional) ===
  "224": { lat: 37.4316, lng: -78.6569 }, // Lynchburg VA
  "225": { lat: 37.4316, lng: -78.6569 }, // Lynchburg VA
  "226": { lat: 36.6859, lng: -80.4533 }, // Martinsville VA
  "227": { lat: 37.2710, lng: -79.9414 }, // Roanoke VA
  "228": { lat: 38.1496, lng: -79.0717 }, // Staunton VA
  "229": { lat: 38.4496, lng: -78.8689 }, // Harrisonburg VA

  "230": { lat: 37.5407, lng: -77.4360 }, // Richmond
  "231": { lat: 37.5407, lng: -77.4360 },
  "232": { lat: 37.5407, lng: -77.4360 },
  "233": { lat: 36.8508, lng: -75.9779 }, // Norfolk
  "234": { lat: 36.8508, lng: -75.9779 },
  "235": { lat: 36.8508, lng: -75.9779 },

  // === VIRGINIA (more) ===
  "236": { lat: 36.8508, lng: -75.9779 }, // Norfolk VA
  "237": { lat: 36.8508, lng: -75.9779 }, // Newport News VA
  "238": { lat: 37.0299, lng: -76.3452 }, // Hampton VA
  "239": { lat: 36.7282, lng: -76.5836 }, // Suffolk VA
  "240": { lat: 37.5407, lng: -77.4360 }, // Richmond VA
  "241": { lat: 37.5407, lng: -77.4360 }, // Richmond VA
  "242": { lat: 37.5407, lng: -77.4360 }, // Richmond VA
  "243": { lat: 37.5407, lng: -77.4360 }, // Richmond VA
  "244": { lat: 38.4496, lng: -78.8689 }, // Charlottesville VA
  "245": { lat: 38.4496, lng: -78.8689 }, // Charlottesville VA
  "246": { lat: 37.4316, lng: -78.6569 }, // Lynchburg VA

  // === WEST VIRGINIA ===
  "247": { lat: 39.4582, lng: -77.9636 }, // Martinsburg WV
  "248": { lat: 39.2843, lng: -81.5623 }, // Parkersburg WV
  "249": { lat: 39.2843, lng: -81.5623 }, // Parkersburg WV
  "250": { lat: 38.3498, lng: -81.6326 }, // Charleston WV
  "251": { lat: 38.3498, lng: -81.6326 }, // Charleston WV
  "252": { lat: 38.3498, lng: -81.6326 }, // Charleston WV
  "253": { lat: 38.3498, lng: -81.6326 }, // Charleston WV
  "254": { lat: 39.4582, lng: -77.9636 }, // Martinsburg WV
  "255": { lat: 38.4192, lng: -82.4452 }, // Huntington WV
  "256": { lat: 38.4192, lng: -82.4452 }, // Huntington WV
  "257": { lat: 38.4192, lng: -82.4452 }, // Huntington WV
  "258": { lat: 37.7817, lng: -81.1884 }, // Beckley WV
  "259": { lat: 37.7817, lng: -81.1884 }, // Beckley WV
  "260": { lat: 39.6295, lng: -79.9559 }, // Morgantown WV
  "261": { lat: 39.6295, lng: -79.9559 }, // Morgantown WV
  "262": { lat: 39.2643, lng: -80.3445 }, // Clarksburg WV
  "263": { lat: 39.2643, lng: -80.3445 }, // Clarksburg WV
  "264": { lat: 39.2643, lng: -80.3445 }, // Clarksburg WV
  "265": { lat: 39.2843, lng: -81.5623 }, // Parkersburg WV
  "266": { lat: 39.2843, lng: -81.5623 }, // Parkersburg WV
  "267": { lat: 39.2843, lng: -81.5623 }, // Parkersburg WV
  "268": { lat: 39.4582, lng: -77.9636 }, // Eastern Panhandle WV

  "270": { lat: 35.2271, lng: -80.8431 }, // Charlotte
  "271": { lat: 36.0999, lng: -80.2442 },
  "272": { lat: 36.0726, lng: -79.7920 },
  "273": { lat: 36.0726, lng: -79.7920 },
  "274": { lat: 36.0726, lng: -79.7920 },
  "275": { lat: 35.7796, lng: -78.6382 }, // Raleigh
  "276": { lat: 35.7796, lng: -78.6382 },
  "277": { lat: 35.7796, lng: -78.6382 },
  "278": { lat: 35.2271, lng: -80.8431 }, // Charlotte
  "279": { lat: 35.2271, lng: -80.8431 },
  "280": { lat: 35.2271, lng: -80.8431 },
  "281": { lat: 35.2271, lng: -80.8431 },
  "282": { lat: 35.2271, lng: -80.8431 },
  "283": { lat: 35.2271, lng: -80.8431 },

  // === NORTH CAROLINA (additional) ===
  "284": { lat: 35.5951, lng: -82.5515 }, // Asheville NC
  "285": { lat: 35.9132, lng: -79.0558 }, // Durham NC
  "286": { lat: 35.0527, lng: -78.8784 }, // Fayetteville NC
  "287": { lat: 35.5951, lng: -82.5515 }, // Asheville NC
  "288": { lat: 35.5951, lng: -82.5515 }, // Asheville NC
  "289": { lat: 35.7796, lng: -78.6382 }, // Raleigh NC

  "290": { lat: 32.7765, lng: -79.9311 }, // Charleston
  "291": { lat: 32.7765, lng: -79.9311 },
  "292": { lat: 34.0007, lng: -81.0348 }, // Columbia SC
  "293": { lat: 34.8526, lng: -82.3940 }, // Greenville
  "294": { lat: 34.8526, lng: -82.3940 },
  "295": { lat: 34.8526, lng: -82.3940 },
  "296": { lat: 34.8526, lng: -82.3940 },
  "297": { lat: 34.0007, lng: -81.0348 },
  "298": { lat: 32.0809, lng: -81.0912 }, // Savannah
  "299": { lat: 32.0809, lng: -81.0912 },
  "300": { lat: 33.7490, lng: -84.3880 }, // Atlanta
  "301": { lat: 33.7490, lng: -84.3880 },
  "302": { lat: 33.7490, lng: -84.3880 },
  "303": { lat: 33.7490, lng: -84.3880 },
  "304": { lat: 33.4490, lng: -84.5880 },
  "305": { lat: 33.9490, lng: -84.0880 },
  "306": { lat: 33.2490, lng: -84.2880 },
  "307": { lat: 34.0490, lng: -84.2880 },
  "308": { lat: 32.4609, lng: -84.9877 }, // Columbus GA
  "309": { lat: 32.8407, lng: -83.6324 }, // Macon
  "310": { lat: 32.0835, lng: -81.0998 }, // Savannah
  "311": { lat: 33.7490, lng: -84.3880 },
  "312": { lat: 32.0809, lng: -81.0912 },
  "313": { lat: 32.0809, lng: -81.0912 },
  "314": { lat: 32.0809, lng: -81.0912 },
  "315": { lat: 31.5785, lng: -84.1557 }, // Albany GA
  "316": { lat: 30.8325, lng: -83.2785 }, // Valdosta
  "317": { lat: 30.8325, lng: -83.2785 },
  "318": { lat: 30.3322, lng: -81.6557 }, // Jacksonville
  "319": { lat: 30.4383, lng: -84.2807 }, // Tallahassee
  "320": { lat: 30.3322, lng: -81.6557 }, // Jacksonville
  "321": { lat: 29.6516, lng: -82.3248 }, // Gainesville
  "322": { lat: 30.3322, lng: -81.6557 },
  "323": { lat: 28.5383, lng: -81.3792 }, // Orlando
  "324": { lat: 28.5383, lng: -81.3792 },
  "325": { lat: 30.4383, lng: -84.2807 },
  "326": { lat: 29.6516, lng: -82.3248 },
  "327": { lat: 28.5383, lng: -81.3792 },
  "328": { lat: 28.5383, lng: -81.3792 },
  "329": { lat: 28.5383, lng: -81.3792 },
  "330": { lat: 25.7617, lng: -80.1918 }, // Miami
  "331": { lat: 25.7617, lng: -80.1918 },
  "332": { lat: 25.7617, lng: -80.1918 },
  "333": { lat: 26.1224, lng: -80.1373 }, // Fort Lauderdale
  "334": { lat: 26.7153, lng: -80.0534 }, // West Palm Beach
  "335": { lat: 27.9506, lng: -82.4572 }, // Tampa
  "336": { lat: 27.9506, lng: -82.4572 },
  "337": { lat: 27.7676, lng: -82.6403 }, // St Pete
  "338": { lat: 27.3364, lng: -82.5307 }, // Sarasota
  "339": { lat: 26.6406, lng: -81.8723 }, // Fort Myers
  "340": { lat: 25.7617, lng: -80.1918 },
  "341": { lat: 26.1224, lng: -80.1373 },
  "342": { lat: 28.0222, lng: -80.6250 }, // Melbourne
  "344": { lat: 28.0836, lng: -80.6081 },
  "346": { lat: 27.9506, lng: -82.4572 },
  "347": { lat: 28.5383, lng: -81.3792 },
  "349": { lat: 26.1420, lng: -81.7948 }, // Naples

  // === ALABAMA ===
  "350": { lat: 33.5207, lng: -86.8025 }, // Birmingham AL
  "351": { lat: 33.5207, lng: -86.8025 }, // Birmingham AL
  "352": { lat: 33.5207, lng: -86.8025 }, // Birmingham AL
  "353": { lat: 33.5207, lng: -86.8025 }, // Birmingham AL
  "354": { lat: 33.2098, lng: -87.5692 }, // Tuscaloosa AL
  "355": { lat: 33.2098, lng: -87.5692 }, // Tuscaloosa AL
  "356": { lat: 34.7304, lng: -86.5861 }, // Huntsville AL
  "357": { lat: 34.7304, lng: -86.5861 }, // Huntsville AL
  "358": { lat: 34.7304, lng: -86.5861 }, // Huntsville AL
  "359": { lat: 33.5207, lng: -86.8025 }, // Birmingham AL
  "360": { lat: 32.3668, lng: -86.3000 }, // Montgomery AL
  "361": { lat: 32.3668, lng: -86.3000 }, // Montgomery AL
  "362": { lat: 33.4054, lng: -85.9877 }, // Anniston AL
  "363": { lat: 31.2279, lng: -85.3905 }, // Dothan AL
  "364": { lat: 31.3271, lng: -85.8556 }, // Enterprise AL
  "365": { lat: 30.6954, lng: -88.0399 }, // Mobile AL
  "366": { lat: 30.6954, lng: -88.0399 }, // Mobile AL
  "367": { lat: 32.4018, lng: -87.0211 }, // Selma AL
  "368": { lat: 32.4018, lng: -87.0211 }, // Selma AL
  "369": { lat: 30.6954, lng: -88.0399 }, // Mobile AL

  // === TENNESSEE ===
  "370": { lat: 36.1627, lng: -86.7816 }, // Nashville TN
  "371": { lat: 36.1627, lng: -86.7816 }, // Nashville TN
  "372": { lat: 36.1627, lng: -86.7816 }, // Nashville TN
  "373": { lat: 35.0456, lng: -85.3097 }, // Chattanooga TN
  "374": { lat: 35.0456, lng: -85.3097 }, // Chattanooga TN
  "375": { lat: 35.2271, lng: -80.8431 }, // Charlotte NC area
  "376": { lat: 35.9132, lng: -84.0831 }, // Johnson City TN
  "377": { lat: 35.9606, lng: -83.9207 }, // Knoxville TN
  "378": { lat: 35.9606, lng: -83.9207 }, // Knoxville TN
  "379": { lat: 35.9606, lng: -83.9207 }, // Knoxville TN
  "380": { lat: 35.1175, lng: -89.9711 }, // Memphis TN
  "381": { lat: 35.1175, lng: -89.9711 }, // Memphis TN
  "382": { lat: 35.6145, lng: -88.8139 }, // Jackson TN
  "383": { lat: 35.6145, lng: -88.8139 }, // Jackson TN
  "384": { lat: 35.8490, lng: -86.3892 }, // Murfreesboro TN
  "385": { lat: 35.3730, lng: -86.2242 }, // Tullahoma TN

  // === MISSISSIPPI ===
  "386": { lat: 32.2988, lng: -90.1848 }, // Jackson MS
  "387": { lat: 33.4504, lng: -88.8184 }, // Columbus MS
  "388": { lat: 34.2576, lng: -88.7034 }, // Tupelo MS
  "389": { lat: 31.3271, lng: -89.2903 }, // Hattiesburg MS
  "390": { lat: 32.2988, lng: -90.1848 }, // Jackson MS
  "391": { lat: 32.2988, lng: -90.1848 }, // Jackson MS
  "392": { lat: 32.2988, lng: -90.1848 }, // Jackson MS
  "393": { lat: 31.3113, lng: -89.2903 }, // Hattiesburg MS
  "394": { lat: 30.3960, lng: -88.8853 }, // Biloxi MS
  "395": { lat: 30.3960, lng: -88.8853 }, // Gulfport MS
  "396": { lat: 32.3526, lng: -88.7034 }, // Meridian MS
  "397": { lat: 33.4504, lng: -88.4270 }, // Starkville MS

  // === KENTUCKY ===
  "400": { lat: 38.2527, lng: -85.7585 }, // Louisville KY
  "401": { lat: 38.2527, lng: -85.7585 }, // Louisville KY
  "402": { lat: 38.2527, lng: -85.7585 }, // Louisville KY
  "403": { lat: 38.0406, lng: -84.5037 }, // Lexington KY
  "404": { lat: 38.0406, lng: -84.5037 }, // Lexington KY
  "405": { lat: 38.0406, lng: -84.5037 }, // Lexington KY
  "406": { lat: 38.0406, lng: -84.5037 }, // Lexington KY
  "407": { lat: 37.8393, lng: -84.2700 }, // Richmond KY
  "408": { lat: 38.0406, lng: -84.5037 }, // Lexington KY
  "409": { lat: 38.0406, lng: -84.5037 }, // Lexington KY
  "410": { lat: 39.0840, lng: -84.5098 }, // Covington KY (Cincinnati area)
  "411": { lat: 38.1938, lng: -84.8633 }, // Frankfort KY
  "412": { lat: 38.1938, lng: -84.8633 }, // Frankfort KY
  "413": { lat: 37.7719, lng: -87.1111 }, // Owensboro KY
  "414": { lat: 37.7719, lng: -87.1111 }, // Owensboro KY
  "415": { lat: 38.2527, lng: -85.7585 }, // Louisville KY
  "416": { lat: 38.2527, lng: -85.7585 }, // Louisville KY
  "417": { lat: 37.0834, lng: -88.6001 }, // Paducah KY
  "418": { lat: 37.0834, lng: -88.6001 }, // Paducah KY
  "420": { lat: 36.9903, lng: -86.4436 }, // Bowling Green KY
  "421": { lat: 36.9903, lng: -86.4436 }, // Bowling Green KY
  "422": { lat: 37.0454, lng: -85.3102 }, // Somerset KY
  "423": { lat: 37.8393, lng: -84.2700 }, // Richmond KY
  "424": { lat: 37.8393, lng: -84.2700 }, // Richmond KY
  "425": { lat: 37.8323, lng: -83.3220 }, // Morehead KY
  "426": { lat: 38.4192, lng: -82.4452 }, // Ashland KY
  "427": { lat: 37.7872, lng: -83.6097 }, // Hazard KY
  "428": { lat: 36.8519, lng: -83.8561 }, // Middlesboro KY
  "429": { lat: 38.4192, lng: -82.4452 }, // Ashland KY

  // Midwest
  "600": { lat: 41.8781, lng: -87.6298 }, // Chicago
  "601": { lat: 41.8781, lng: -87.6298 },
  "602": { lat: 41.8781, lng: -87.6298 },
  "603": { lat: 41.8781, lng: -87.6298 },
  "604": { lat: 41.8781, lng: -87.6298 },
  "605": { lat: 41.8781, lng: -87.6298 },
  "606": { lat: 41.8781, lng: -87.6298 },
  "607": { lat: 41.8781, lng: -87.6298 },
  "608": { lat: 41.8781, lng: -87.6298 },
  "609": { lat: 41.5281, lng: -88.0898 },

  // === ILLINOIS (additional) ===
  "610": { lat: 41.5067, lng: -90.5151 }, // Rock Island IL
  "611": { lat: 40.4750, lng: -88.9903 }, // Bloomington IL
  "612": { lat: 40.4750, lng: -88.9903 }, // Bloomington IL
  "613": { lat: 40.1164, lng: -88.2434 }, // Champaign IL
  "614": { lat: 40.1164, lng: -88.2434 }, // Champaign IL
  "615": { lat: 40.6331, lng: -89.3985 }, // Peoria IL
  "616": { lat: 40.6331, lng: -89.3985 }, // Peoria IL
  "617": { lat: 40.4750, lng: -88.9903 }, // Bloomington IL
  "618": { lat: 40.4750, lng: -88.9903 }, // Bloomington IL
  "619": { lat: 40.6331, lng: -89.3985 }, // Peoria IL
  "620": { lat: 39.7817, lng: -89.6501 }, // Springfield IL
  "621": { lat: 39.7817, lng: -89.6501 }, // Springfield IL
  "622": { lat: 38.6270, lng: -90.1994 }, // East St Louis IL
  "623": { lat: 39.8403, lng: -88.9548 }, // Decatur IL
  "624": { lat: 39.7990, lng: -88.9719 }, // Decatur IL
  "625": { lat: 39.7817, lng: -89.6501 }, // Springfield IL
  "626": { lat: 39.7817, lng: -89.6501 }, // Springfield IL
  "627": { lat: 39.7817, lng: -89.6501 }, // Springfield IL
  "628": { lat: 38.5200, lng: -89.9839 }, // Belleville IL
  "629": { lat: 37.7273, lng: -89.2168 }, // Carbondale IL

  // === MISSOURI ===
  "630": { lat: 38.6270, lng: -90.1994 }, // St Louis MO
  "631": { lat: 38.6270, lng: -90.1994 }, // St Louis MO
  "633": { lat: 38.6270, lng: -90.1994 }, // St Louis MO
  "634": { lat: 38.6270, lng: -90.1994 }, // St Louis MO
  "635": { lat: 38.6270, lng: -90.1994 }, // St Louis MO
  "636": { lat: 38.6270, lng: -90.1994 }, // St Louis MO
  "637": { lat: 38.9517, lng: -92.3341 }, // Columbia MO
  "638": { lat: 38.9517, lng: -92.3341 }, // Columbia MO
  "639": { lat: 38.9517, lng: -92.3341 }, // Columbia MO
  "640": { lat: 39.0997, lng: -94.5786 }, // Kansas City MO
  "641": { lat: 39.0997, lng: -94.5786 }, // Kansas City MO
  "644": { lat: 39.7684, lng: -94.8463 }, // St Joseph MO
  "645": { lat: 39.7684, lng: -94.8463 }, // St Joseph MO
  "646": { lat: 40.1947, lng: -92.5810 }, // Kirksville MO
  "647": { lat: 39.0997, lng: -94.5786 }, // Kansas City MO
  "648": { lat: 37.2090, lng: -93.2923 }, // Springfield MO
  "649": { lat: 39.0997, lng: -94.5786 }, // Kansas City MO
  "650": { lat: 38.5767, lng: -92.1735 }, // Jefferson City MO
  "651": { lat: 38.5767, lng: -92.1735 }, // Jefferson City MO
  "652": { lat: 38.5767, lng: -92.1735 }, // Jefferson City MO
  "653": { lat: 38.2494, lng: -90.5243 }, // Festus MO
  "654": { lat: 37.8715, lng: -90.3797 }, // Farmington MO
  "655": { lat: 37.2090, lng: -93.2923 }, // Springfield MO
  "656": { lat: 37.2090, lng: -93.2923 }, // Springfield MO
  "657": { lat: 37.2090, lng: -93.2923 }, // Springfield MO
  "658": { lat: 37.2090, lng: -93.2923 }, // Springfield MO
  "659": { lat: 38.7767, lng: -90.5226 }, // St Charles MO

  // === KANSAS ===
  "660": { lat: 39.1155, lng: -94.6268 }, // Kansas City KS
  "661": { lat: 39.1155, lng: -94.6268 }, // Kansas City KS
  "662": { lat: 39.1155, lng: -94.6268 }, // Kansas City KS
  "664": { lat: 39.0483, lng: -95.6780 }, // Topeka KS
  "665": { lat: 39.0483, lng: -95.6780 }, // Topeka KS
  "666": { lat: 39.0483, lng: -95.6780 }, // Topeka KS
  "667": { lat: 38.9717, lng: -95.2353 }, // Lawrence KS
  "668": { lat: 39.0483, lng: -95.6780 }, // Topeka KS
  "669": { lat: 39.1141, lng: -96.6754 }, // Manhattan KS
  "670": { lat: 37.6872, lng: -97.3301 }, // Wichita KS
  "671": { lat: 37.6872, lng: -97.3301 }, // Wichita KS
  "672": { lat: 37.6872, lng: -97.3301 }, // Wichita KS
  "673": { lat: 37.7530, lng: -100.0173 }, // Dodge City KS
  "674": { lat: 38.8839, lng: -99.3267 }, // Hays KS
  "675": { lat: 37.0842, lng: -100.9239 }, // Liberal KS
  "676": { lat: 38.7392, lng: -99.3123 }, // Russell KS
  "677": { lat: 39.3667, lng: -101.0483 }, // Colby KS
  "678": { lat: 37.7530, lng: -100.0173 }, // Dodge City KS
  "679": { lat: 37.0417, lng: -97.3333 }, // Arkansas City KS

  // === NEBRASKA ===
  "680": { lat: 41.2565, lng: -95.9345 }, // Omaha NE
  "681": { lat: 41.2565, lng: -95.9345 }, // Omaha NE
  "683": { lat: 40.8258, lng: -96.6852 }, // Lincoln NE
  "684": { lat: 40.8258, lng: -96.6852 }, // Lincoln NE
  "685": { lat: 40.8258, lng: -96.6852 }, // Lincoln NE
  "686": { lat: 42.0772, lng: -97.4339 }, // Norfolk NE
  "687": { lat: 42.0772, lng: -97.4339 }, // Norfolk NE
  "688": { lat: 40.6934, lng: -99.0814 }, // Kearney NE
  "689": { lat: 40.9264, lng: -98.3420 }, // Grand Island NE
  "690": { lat: 40.9264, lng: -98.3420 }, // Grand Island NE
  "691": { lat: 41.1403, lng: -100.7601 }, // North Platte NE
  "692": { lat: 41.1403, lng: -100.7601 }, // North Platte NE
  "693": { lat: 41.8666, lng: -103.6673 }, // Scottsbluff NE
  "694": { lat: 41.8666, lng: -103.6673 }, // Scottsbluff NE
  "695": { lat: 42.4272, lng: -97.3982 }, // Norfolk NE

  "430": { lat: 41.6528, lng: -83.5379 }, // Toledo
  "431": { lat: 41.6528, lng: -83.5379 },
  "432": { lat: 39.9612, lng: -82.9988 }, // Columbus OH
  "433": { lat: 39.9612, lng: -82.9988 },
  "434": { lat: 39.9612, lng: -82.9988 },
  "435": { lat: 41.0993, lng: -81.5126 }, // Akron
  "436": { lat: 41.0993, lng: -81.5126 },
  "437": { lat: 40.7989, lng: -81.3784 }, // Canton
  "438": { lat: 40.7989, lng: -81.3784 },
  "439": { lat: 41.0814, lng: -81.5190 },
  "440": { lat: 41.4993, lng: -81.6944 }, // Cleveland
  "441": { lat: 41.4993, lng: -81.6944 },
  "442": { lat: 41.4993, lng: -81.6944 },
  "443": { lat: 41.4993, lng: -81.6944 },
  "444": { lat: 41.0993, lng: -80.6494 }, // Youngstown
  "445": { lat: 41.0993, lng: -80.6494 },
  "446": { lat: 41.0993, lng: -80.6494 },
  "447": { lat: 41.0993, lng: -80.6494 },
  "448": { lat: 40.4173, lng: -80.0145 },
  "449": { lat: 40.4173, lng: -80.0145 },
  "450": { lat: 39.1031, lng: -84.5120 }, // Cincinnati
  "451": { lat: 39.1031, lng: -84.5120 },
  "452": { lat: 39.1031, lng: -84.5120 },
  "453": { lat: 39.7589, lng: -84.1916 }, // Dayton
  "454": { lat: 39.7589, lng: -84.1916 },
  "455": { lat: 39.7589, lng: -84.1916 },
  "456": { lat: 39.7589, lng: -84.1916 },
  "457": { lat: 39.7589, lng: -84.1916 },
  "458": { lat: 40.0581, lng: -83.4453 },
  "459": { lat: 40.0581, lng: -83.4453 },
  "460": { lat: 39.7684, lng: -86.1581 }, // Indianapolis
  "461": { lat: 39.7684, lng: -86.1581 },
  "462": { lat: 39.7684, lng: -86.1581 },
  "463": { lat: 39.7684, lng: -86.1581 },
  "464": { lat: 40.4167, lng: -86.8753 }, // Lafayette
  "465": { lat: 40.4167, lng: -86.8753 },
  "466": { lat: 41.0793, lng: -85.1394 }, // Fort Wayne
  "467": { lat: 41.0793, lng: -85.1394 },
  "468": { lat: 41.0793, lng: -85.1394 },
  "469": { lat: 41.6764, lng: -86.2520 }, // South Bend
  "470": { lat: 39.1031, lng: -84.5120 },
  "471": { lat: 38.2527, lng: -85.7585 }, // Louisville
  "472": { lat: 38.2527, lng: -85.7585 },
  "473": { lat: 37.9716, lng: -87.5711 }, // Evansville
  "474": { lat: 39.1653, lng: -86.5264 }, // Bloomington
  "475": { lat: 39.4667, lng: -87.4139 },
  "476": { lat: 39.4667, lng: -87.4139 },
  "477": { lat: 37.9716, lng: -87.5711 },
  "478": { lat: 39.4667, lng: -87.4139 },
  "479": { lat: 40.7608, lng: -86.7816 },
  "480": { lat: 42.3314, lng: -83.0458 }, // Detroit
  "481": { lat: 42.3314, lng: -83.0458 },
  "482": { lat: 42.3314, lng: -83.0458 },
  "483": { lat: 42.3314, lng: -83.0458 },
  "484": { lat: 43.0125, lng: -83.6875 }, // Flint
  "485": { lat: 43.0125, lng: -83.6875 },
  "486": { lat: 43.4195, lng: -83.9508 }, // Saginaw
  "487": { lat: 43.4195, lng: -83.9508 },
  "488": { lat: 42.7325, lng: -84.5555 }, // Lansing
  "489": { lat: 42.7325, lng: -84.5555 },
  "490": { lat: 42.2917, lng: -85.5872 }, // Kalamazoo
  "491": { lat: 42.2917, lng: -85.5872 },
  "492": { lat: 42.2917, lng: -85.5872 },
  "493": { lat: 42.9634, lng: -85.6681 }, // Grand Rapids
  "494": { lat: 42.9634, lng: -85.6681 },
  "495": { lat: 42.9634, lng: -85.6681 },
  "496": { lat: 44.7631, lng: -85.6206 }, // Traverse City
  "497": { lat: 44.3148, lng: -85.6024 },
  "498": { lat: 46.5436, lng: -87.3954 }, // Marquette
  "499": { lat: 46.4877, lng: -84.3453 }, // Sault Ste Marie

  // === IOWA ===
  "500": { lat: 41.5868, lng: -93.6250 }, // Des Moines IA
  "501": { lat: 41.5868, lng: -93.6250 }, // Des Moines IA
  "502": { lat: 41.5868, lng: -93.6250 }, // Des Moines IA
  "503": { lat: 41.5868, lng: -93.6250 }, // Des Moines IA
  "504": { lat: 42.4975, lng: -94.1680 }, // Fort Dodge IA
  "505": { lat: 42.4975, lng: -94.1680 }, // Fort Dodge IA
  "506": { lat: 42.4958, lng: -90.6672 }, // Dubuque IA
  "507": { lat: 42.4958, lng: -90.6672 }, // Dubuque IA
  "508": { lat: 42.0308, lng: -93.6319 }, // Ames IA
  "509": { lat: 41.5868, lng: -93.6250 }, // Des Moines IA
  "510": { lat: 42.4972, lng: -96.4003 }, // Sioux City IA
  "511": { lat: 42.4972, lng: -96.4003 }, // Sioux City IA
  "512": { lat: 42.4972, lng: -96.4003 }, // Sioux City IA
  "513": { lat: 42.4972, lng: -96.4003 }, // Sioux City IA
  "514": { lat: 40.8067, lng: -91.1129 }, // Burlington IA
  "515": { lat: 41.2619, lng: -95.8608 }, // Council Bluffs IA
  "516": { lat: 41.2619, lng: -95.8608 }, // Council Bluffs IA
  "520": { lat: 41.5868, lng: -93.6250 }, // Des Moines IA
  "521": { lat: 41.0007, lng: -92.9103 }, // Ottumwa IA
  "522": { lat: 41.9792, lng: -91.6625 }, // Cedar Rapids IA
  "523": { lat: 41.9792, lng: -91.6625 }, // Cedar Rapids IA
  "524": { lat: 41.9792, lng: -91.6625 }, // Cedar Rapids IA
  "525": { lat: 42.5006, lng: -92.3398 }, // Waterloo IA
  "526": { lat: 42.5006, lng: -92.3398 }, // Waterloo IA
  "527": { lat: 41.6611, lng: -91.5302 }, // Iowa City IA
  "528": { lat: 41.5225, lng: -90.5776 }, // Davenport IA

  "530": { lat: 43.0731, lng: -89.4012 }, // Madison
  "531": { lat: 43.0389, lng: -87.9065 }, // Milwaukee
  "532": { lat: 43.0389, lng: -87.9065 },
  "534": { lat: 42.7261, lng: -87.7828 }, // Racine
  "535": { lat: 43.0389, lng: -87.9065 },
  "537": { lat: 43.0731, lng: -89.4012 },
  "538": { lat: 43.0731, lng: -89.4012 },
  "539": { lat: 43.0731, lng: -89.4012 },
  "540": { lat: 43.7844, lng: -88.4469 },
  "541": { lat: 44.5192, lng: -88.0198 }, // Green Bay
  "542": { lat: 44.5192, lng: -88.0198 },
  "543": { lat: 44.5192, lng: -88.0198 },
  "544": { lat: 44.9591, lng: -89.6302 }, // Wausau
  "545": { lat: 44.9591, lng: -89.6302 },
  "546": { lat: 43.8014, lng: -91.2396 }, // La Crosse
  "547": { lat: 44.8113, lng: -91.4985 }, // Eau Claire
  "548": { lat: 44.8113, lng: -91.4985 },
  "549": { lat: 43.4203, lng: -88.1865 },
  "550": { lat: 44.9778, lng: -93.2650 }, // Minneapolis
  "551": { lat: 44.9778, lng: -93.2650 },
  "553": { lat: 44.9778, lng: -93.2650 },
  "554": { lat: 44.9778, lng: -93.2650 },
  "555": { lat: 44.9778, lng: -93.2650 },
  "556": { lat: 46.7867, lng: -92.1005 }, // Duluth
  "557": { lat: 46.7867, lng: -92.1005 },
  "558": { lat: 46.7867, lng: -92.1005 },
  "559": { lat: 44.0121, lng: -92.4802 }, // Rochester MN
  "560": { lat: 44.0805, lng: -93.2694 }, // Mankato
  "561": { lat: 44.0121, lng: -92.4802 },
  "562": { lat: 45.5579, lng: -94.1632 }, // St Cloud
  "563": { lat: 45.5579, lng: -94.1632 },
  "564": { lat: 47.4753, lng: -94.8803 }, // Bemidji
  "565": { lat: 47.4753, lng: -94.8803 },
  "566": { lat: 46.8772, lng: -96.7898 }, // Moorhead
  "567": { lat: 48.1170, lng: -96.1839 }, // Thief River Falls

  // === SOUTH DAKOTA ===
  "570": { lat: 43.5460, lng: -96.7313 }, // Sioux Falls SD
  "571": { lat: 43.5460, lng: -96.7313 }, // Sioux Falls SD
  "572": { lat: 42.8833, lng: -97.3917 }, // Yankton SD
  "573": { lat: 43.7064, lng: -98.0279 }, // Mitchell SD
  "574": { lat: 44.0805, lng: -103.2310 }, // Rapid City SD
  "575": { lat: 44.3683, lng: -100.3510 }, // Pierre SD
  "576": { lat: 45.4605, lng: -98.4862 }, // Aberdeen SD
  "577": { lat: 44.0805, lng: -103.2310 }, // Rapid City SD

  // === NORTH DAKOTA ===
  "580": { lat: 46.8772, lng: -96.7898 }, // Fargo ND
  "581": { lat: 46.8772, lng: -96.7898 }, // Fargo ND
  "582": { lat: 47.9253, lng: -97.0329 }, // Grand Forks ND
  "583": { lat: 48.2330, lng: -101.2963 }, // Minot ND
  "584": { lat: 48.2330, lng: -101.2963 }, // Minot ND
  "585": { lat: 46.8083, lng: -100.7837 }, // Bismarck ND
  "586": { lat: 46.8083, lng: -100.7837 }, // Bismarck ND
  "587": { lat: 46.8083, lng: -100.7837 }, // Bismarck ND
  "588": { lat: 48.8651, lng: -103.2830 }, // Williston ND

  // === MONTANA ===
  "590": { lat: 45.7833, lng: -108.5007 }, // Billings MT
  "591": { lat: 45.7833, lng: -108.5007 }, // Billings MT
  "592": { lat: 48.2105, lng: -106.6350 }, // Wolf Point MT
  "593": { lat: 47.5053, lng: -111.2827 }, // Great Falls MT
  "594": { lat: 47.5053, lng: -111.2827 }, // Great Falls MT
  "595": { lat: 48.4114, lng: -114.3374 }, // Kalispell MT
  "596": { lat: 46.8787, lng: -114.0097 }, // Missoula MT
  "597": { lat: 45.6770, lng: -111.0429 }, // Bozeman MT
  "598": { lat: 46.5884, lng: -112.0391 }, // Helena MT
  "599": { lat: 46.0038, lng: -112.5348 }, // Butte MT

  // Southwest
  "700": { lat: 29.9511, lng: -90.0715 }, // New Orleans
  "701": { lat: 29.9511, lng: -90.0715 },
  "702": { lat: 29.9511, lng: -90.0715 },
  "703": { lat: 29.9511, lng: -90.0715 },
  "704": { lat: 29.9511, lng: -90.0715 },
  "705": { lat: 30.4515, lng: -91.1871 }, // Baton Rouge
  "706": { lat: 30.4515, lng: -91.1871 },
  "707": { lat: 30.4515, lng: -91.1871 },
  "708": { lat: 30.2241, lng: -92.0198 }, // Lafayette LA
  "710": { lat: 32.5252, lng: -93.7502 }, // Shreveport
  "711": { lat: 32.5252, lng: -93.7502 },
  "712": { lat: 32.5252, lng: -93.7502 },
  "713": { lat: 31.3113, lng: -92.4451 }, // Alexandria LA
  "714": { lat: 30.2266, lng: -93.2174 }, // Lake Charles
  "715": { lat: 30.2266, lng: -93.2174 },
  "716": { lat: 32.5093, lng: -92.1193 }, // Monroe LA
  "717": { lat: 32.5093, lng: -92.1193 },
  "718": { lat: 32.5093, lng: -92.1193 },
  "719": { lat: 30.0686, lng: -91.1403 },
  "720": { lat: 32.3668, lng: -86.3000 }, // Montgomery AL
  "721": { lat: 32.3668, lng: -86.3000 },
  "722": { lat: 32.3668, lng: -86.3000 },
  "723": { lat: 33.5207, lng: -86.8025 }, // Birmingham
  "724": { lat: 33.5207, lng: -86.8025 },
  "725": { lat: 34.7304, lng: -86.5861 }, // Huntsville
  "726": { lat: 34.7304, lng: -86.5861 },
  "727": { lat: 33.5207, lng: -86.8025 },
  "728": { lat: 33.5207, lng: -86.8025 },
  "729": { lat: 33.5207, lng: -86.8025 },
  "730": { lat: 35.4676, lng: -97.5164 }, // Oklahoma City
  "731": { lat: 35.4676, lng: -97.5164 },
  "734": { lat: 35.4676, lng: -97.5164 },
  "735": { lat: 35.4676, lng: -97.5164 },
  "736": { lat: 36.1540, lng: -95.9928 }, // Tulsa
  "740": { lat: 36.1540, lng: -95.9928 },
  "741": { lat: 36.1540, lng: -95.9928 },
  "744": { lat: 34.6036, lng: -98.3959 }, // Lawton
  "745": { lat: 34.6036, lng: -98.3959 },
  "746": { lat: 35.0078, lng: -97.0929 },
  "747": { lat: 34.7554, lng: -96.6716 },
  "748": { lat: 33.9137, lng: -98.4934 }, // Wichita Falls
  "749": { lat: 34.4857, lng: -93.0537 }, // Hot Springs
  "750": { lat: 32.7767, lng: -96.7970 }, // Dallas
  "751": { lat: 32.7767, lng: -96.7970 },
  "752": { lat: 32.7767, lng: -96.7970 },
  "753": { lat: 32.7767, lng: -96.7970 },
  "754": { lat: 32.9545, lng: -96.8289 },
  "755": { lat: 33.1582, lng: -96.1089 },
  "756": { lat: 32.3513, lng: -95.3011 }, // Tyler
  "757": { lat: 32.3513, lng: -95.3011 },
  "758": { lat: 32.3513, lng: -95.3011 },
  "759": { lat: 33.4484, lng: -94.0427 }, // Texarkana
  "760": { lat: 32.7555, lng: -97.3308 }, // Fort Worth
  "761": { lat: 32.7555, lng: -97.3308 },
  "762": { lat: 32.7555, lng: -97.3308 },
  "763": { lat: 33.4484, lng: -97.1331 }, // Denton
  "764": { lat: 33.4484, lng: -97.1331 },
  "765": { lat: 31.5493, lng: -97.1467 }, // Waco
  "766": { lat: 31.5493, lng: -97.1467 },
  "767": { lat: 31.5493, lng: -97.1467 },
  "768": { lat: 32.4487, lng: -99.7331 }, // Abilene
  "769": { lat: 31.8457, lng: -102.3676 }, // Midland
  "770": { lat: 29.7604, lng: -95.3698 }, // Houston
  "771": { lat: 29.7604, lng: -95.3698 },
  "772": { lat: 29.7604, lng: -95.3698 },
  "773": { lat: 29.7604, lng: -95.3698 },
  "774": { lat: 29.7604, lng: -95.3698 },
  "775": { lat: 29.7604, lng: -95.3698 },
  "776": { lat: 30.0802, lng: -94.1266 }, // Beaumont
  "777": { lat: 30.0802, lng: -94.1266 },
  "778": { lat: 30.2672, lng: -97.7431 }, // Austin
  "779": { lat: 30.6954, lng: -96.3022 }, // Bryan
  "780": { lat: 29.4241, lng: -98.4936 }, // San Antonio
  "781": { lat: 29.4241, lng: -98.4936 },
  "782": { lat: 29.4241, lng: -98.4936 },
  "783": { lat: 27.8006, lng: -97.3964 }, // Corpus Christi
  "784": { lat: 27.8006, lng: -97.3964 },
  "785": { lat: 26.2034, lng: -98.2300 }, // McAllen
  "786": { lat: 30.2672, lng: -97.7431 },
  "787": { lat: 30.2672, lng: -97.7431 },
  "788": { lat: 30.2672, lng: -97.7431 },
  "789": { lat: 30.2672, lng: -97.7431 },
  "790": { lat: 33.5779, lng: -101.8552 }, // Lubbock
  "791": { lat: 35.2220, lng: -101.8313 }, // Amarillo
  "792": { lat: 35.2220, lng: -101.8313 },
  "793": { lat: 33.5779, lng: -101.8552 },
  "794": { lat: 33.5779, lng: -101.8552 },
  "795": { lat: 33.5779, lng: -101.8552 },
  "796": { lat: 33.5779, lng: -101.8552 },
  "797": { lat: 31.7619, lng: -106.4850 }, // El Paso
  "798": { lat: 31.7619, lng: -106.4850 },
  "799": { lat: 31.7619, lng: -106.4850 },

  // Mountain
  "800": { lat: 39.7392, lng: -104.9903 }, // Denver
  "801": { lat: 39.7392, lng: -104.9903 },
  "802": { lat: 39.7392, lng: -104.9903 },
  "803": { lat: 39.7392, lng: -104.9903 },
  "804": { lat: 39.7392, lng: -104.9903 },
  "805": { lat: 39.7392, lng: -104.9903 },
  "806": { lat: 39.7392, lng: -104.9903 },
  "807": { lat: 39.7392, lng: -104.9903 },
  "808": { lat: 38.8339, lng: -104.8214 }, // Colorado Springs
  "809": { lat: 38.8339, lng: -104.8214 },
  "810": { lat: 38.8339, lng: -104.8214 },
  "811": { lat: 39.0997, lng: -108.5507 }, // Grand Junction
  "812": { lat: 37.2753, lng: -107.8801 }, // Durango
  "813": { lat: 37.2753, lng: -107.8801 },
  "814": { lat: 39.0997, lng: -108.5507 },
  "815": { lat: 39.0997, lng: -108.5507 },
  "816": { lat: 40.5853, lng: -105.0844 }, // Fort Collins
  "820": { lat: 41.1400, lng: -104.8202 }, // Cheyenne
  "821": { lat: 41.1400, lng: -104.8202 },
  "822": { lat: 43.0760, lng: -107.2903 }, // Casper
  "823": { lat: 44.0805, lng: -103.2310 },
  "824": { lat: 42.8666, lng: -106.3131 },
  "825": { lat: 44.2831, lng: -105.5022 },
  "826": { lat: 42.8666, lng: -106.3131 },
  "827": { lat: 41.3114, lng: -105.5911 },
  "828": { lat: 42.8666, lng: -106.3131 },
  "829": { lat: 41.5868, lng: -109.2029 },
  "830": { lat: 41.1400, lng: -104.8202 },
  "831": { lat: 44.0805, lng: -103.2310 },
  "832": { lat: 43.4799, lng: -110.7624 }, // Jackson
  "833": { lat: 42.4325, lng: -110.1345 },
  "834": { lat: 44.5263, lng: -109.0565 }, // Cody
  "835": { lat: 44.5263, lng: -109.0565 },
  "836": { lat: 44.5263, lng: -109.0565 },
  "837": { lat: 44.5263, lng: -109.0565 },
  "838": { lat: 47.6777, lng: -116.7805 }, // Northern Idaho (Coeur d'Alene/Bonners Ferry)
  "839": { lat: 47.6777, lng: -116.7805 }, // Northern Idaho
  "840": { lat: 40.7608, lng: -111.8910 }, // Salt Lake City
  "841": { lat: 40.7608, lng: -111.8910 },
  "842": { lat: 40.7608, lng: -111.8910 },
  "843": { lat: 41.2230, lng: -111.9738 }, // Ogden
  "844": { lat: 41.2230, lng: -111.9738 },
  "845": { lat: 40.2338, lng: -111.6585 }, // Provo
  "846": { lat: 40.2338, lng: -111.6585 },
  "847": { lat: 40.2338, lng: -111.6585 },
  "850": { lat: 33.4484, lng: -112.0740 }, // Phoenix
  "851": { lat: 33.4484, lng: -112.0740 },
  "852": { lat: 33.4484, lng: -112.0740 },
  "853": { lat: 33.4484, lng: -112.0740 },
  "855": { lat: 33.4150, lng: -111.8315 }, // Mesa
  "856": { lat: 32.2217, lng: -110.9265 }, // Tucson
  "857": { lat: 32.2217, lng: -110.9265 },
  "859": { lat: 32.2217, lng: -110.9265 },
  "860": { lat: 35.1983, lng: -111.6513 }, // Flagstaff
  "863": { lat: 34.5400, lng: -112.4685 }, // Prescott
  "864": { lat: 34.9301, lng: -110.1395 },
  "865": { lat: 35.1983, lng: -111.6513 },
  "870": { lat: 35.0844, lng: -106.6504 }, // Albuquerque
  "871": { lat: 35.0844, lng: -106.6504 },
  "873": { lat: 35.0844, lng: -106.6504 },
  "874": { lat: 35.6870, lng: -105.9378 }, // Santa Fe
  "875": { lat: 35.6870, lng: -105.9378 },
  "877": { lat: 36.7282, lng: -108.2187 }, // Farmington
  "878": { lat: 35.5281, lng: -108.7426 }, // Gallup
  "879": { lat: 36.9064, lng: -104.4405 }, // Raton
  "880": { lat: 32.3199, lng: -106.7637 }, // Las Cruces
  "881": { lat: 32.8838, lng: -105.9625 }, // Alamogordo
  "882": { lat: 33.3943, lng: -104.5230 }, // Roswell
  "883": { lat: 33.4213, lng: -103.1965 }, // Clovis
  "884": { lat: 36.4072, lng: -105.5731 }, // Taos
  "885": { lat: 31.7619, lng: -106.4850 },
  "890": { lat: 36.1699, lng: -115.1398 }, // Las Vegas
  "891": { lat: 36.1699, lng: -115.1398 },
  "893": { lat: 38.8026, lng: -116.4194 }, // Ely
  "894": { lat: 39.5296, lng: -119.8138 }, // Reno
  "895": { lat: 39.5296, lng: -119.8138 },
  "897": { lat: 39.1638, lng: -119.7674 }, // Carson City
  "898": { lat: 40.8380, lng: -115.7631 }, // Elko

  // Pacific
  "900": { lat: 34.0522, lng: -118.2437 }, // LA
  "901": { lat: 34.0522, lng: -118.2437 },
  "902": { lat: 34.0522, lng: -118.2437 },
  "903": { lat: 34.0522, lng: -118.2437 },
  "904": { lat: 34.0522, lng: -118.2437 },
  "905": { lat: 33.7701, lng: -118.1937 }, // Long Beach
  "906": { lat: 33.7701, lng: -118.1937 },
  "907": { lat: 33.7701, lng: -118.1937 },
  "908": { lat: 33.7701, lng: -118.1937 },
  "910": { lat: 34.1808, lng: -118.3090 }, // Pasadena
  "911": { lat: 34.1808, lng: -118.3090 },
  "912": { lat: 34.1808, lng: -118.3090 },
  "913": { lat: 34.2011, lng: -118.5343 }, // Van Nuys
  "914": { lat: 34.2011, lng: -118.5343 },
  "915": { lat: 34.2087, lng: -118.1663 }, // Burbank
  "916": { lat: 34.2087, lng: -118.1663 },
  "917": { lat: 34.0522, lng: -118.2437 },
  "918": { lat: 34.0522, lng: -118.2437 },
  "919": { lat: 34.0195, lng: -118.4912 }, // Santa Monica
  "920": { lat: 32.7157, lng: -117.1611 }, // San Diego
  "921": { lat: 32.7157, lng: -117.1611 },
  "922": { lat: 33.8358, lng: -116.5453 }, // Palm Springs
  "923": { lat: 33.7701, lng: -116.9598 }, // Riverside
  "924": { lat: 34.0633, lng: -117.6509 }, // San Bernardino
  "925": { lat: 34.0633, lng: -117.6509 },
  "926": { lat: 33.8366, lng: -117.9143 }, // Anaheim
  "927": { lat: 33.8366, lng: -117.9143 },
  "928": { lat: 33.8366, lng: -117.9143 },
  "930": { lat: 34.4208, lng: -119.6982 }, // Santa Barbara
  "931": { lat: 34.4208, lng: -119.6982 },
  "932": { lat: 35.3733, lng: -119.0187 }, // Bakersfield
  "933": { lat: 35.3733, lng: -119.0187 },
  "934": { lat: 34.0195, lng: -118.4912 },
  "935": { lat: 35.2828, lng: -120.6596 }, // San Luis Obispo
  "936": { lat: 36.7468, lng: -119.7726 }, // Fresno
  "937": { lat: 36.7468, lng: -119.7726 },
  "938": { lat: 36.7468, lng: -119.7726 },
  "939": { lat: 36.6002, lng: -121.8947 }, // Salinas
  "940": { lat: 37.7749, lng: -122.4194 }, // San Francisco
  "941": { lat: 37.7749, lng: -122.4194 },
  "942": { lat: 38.5816, lng: -121.4944 }, // Sacramento
  "943": { lat: 37.9577, lng: -121.2908 }, // Stockton
  "944": { lat: 37.9577, lng: -121.2908 },
  "945": { lat: 37.8044, lng: -122.2712 }, // Oakland
  "946": { lat: 37.8044, lng: -122.2712 },
  "947": { lat: 37.5585, lng: -122.2711 }, // Hayward
  "948": { lat: 37.5585, lng: -122.2711 },
  "949": { lat: 37.3861, lng: -122.0839 }, // Mountain View
  "950": { lat: 37.3382, lng: -121.8863 }, // San Jose
  "951": { lat: 37.3382, lng: -121.8863 },
  "952": { lat: 37.3382, lng: -121.8863 },
  "953": { lat: 37.3382, lng: -121.8863 },
  "954": { lat: 37.5585, lng: -122.2711 },
  "955": { lat: 38.2975, lng: -122.2869 }, // Napa
  "956": { lat: 38.5816, lng: -121.4944 },
  "957": { lat: 38.5816, lng: -121.4944 },
  "958": { lat: 38.5816, lng: -121.4944 },
  "959": { lat: 38.5816, lng: -121.4944 },
  "960": { lat: 40.5865, lng: -122.3917 }, // Redding
  "961": { lat: 40.5865, lng: -122.3917 },
  "970": { lat: 45.5051, lng: -122.6750 }, // Portland
  "971": { lat: 45.5051, lng: -122.6750 },
  "972": { lat: 45.5051, lng: -122.6750 },
  "973": { lat: 45.5051, lng: -122.6750 },
  "974": { lat: 44.0521, lng: -123.0868 }, // Eugene
  "975": { lat: 42.3265, lng: -122.8756 }, // Medford
  "976": { lat: 44.9429, lng: -123.0351 }, // Salem
  "977": { lat: 44.9429, lng: -123.0351 },
  "978": { lat: 45.6387, lng: -122.6615 },
  "979": { lat: 43.8041, lng: -120.5542 }, // Bend
  "980": { lat: 47.6062, lng: -122.3321 }, // Seattle
  "981": { lat: 47.6062, lng: -122.3321 },
  "982": { lat: 47.6062, lng: -122.3321 },
  "983": { lat: 47.2529, lng: -122.4443 }, // Tacoma
  "984": { lat: 47.2529, lng: -122.4443 },
  "985": { lat: 47.0379, lng: -122.9007 }, // Olympia
  "986": { lat: 45.6387, lng: -122.6615 }, // Vancouver WA
  "988": { lat: 46.2804, lng: -119.2752 }, // Tri-Cities
  "989": { lat: 47.6588, lng: -117.4260 }, // Spokane
  "990": { lat: 47.6588, lng: -117.4260 },
  "991": { lat: 47.6588, lng: -117.4260 },
  "992": { lat: 47.6588, lng: -117.4260 },
  "993": { lat: 46.7324, lng: -117.0002 }, // Pullman
  "994": { lat: 46.5958, lng: -120.5445 }, // Yakima
  "995": { lat: 61.2181, lng: -149.9003 }, // Anchorage
  "996": { lat: 61.2181, lng: -149.9003 },
  "997": { lat: 64.8378, lng: -147.7164 }, // Fairbanks
  "998": { lat: 58.3019, lng: -134.4197 }, // Juneau
  "999": { lat: 55.3422, lng: -131.6461 }, // Ketchikan
  "967": { lat: 21.3069, lng: -157.8583 }, // Honolulu
  "968": { lat: 21.3069, lng: -157.8583 },
};

// Calculate distance between two zip codes using Haversine formula
function calculateDistance(zip1: string, zip2: string): number | null {
  const prefix1 = zip1.substring(0, 3);
  const prefix2 = zip2.substring(0, 3);

  const coord1 = zipRegions[prefix1];
  const coord2 = zipRegions[prefix2];

  if (!coord1 || !coord2) {
    return null;
  }

  const R = 3959; // Earth's radius in miles
  const dLat = ((coord2.lat - coord1.lat) * Math.PI) / 180;
  const dLon = ((coord2.lng - coord1.lng) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((coord1.lat * Math.PI) / 180) *
      Math.cos((coord2.lat * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// Calculate shipping estimate based on distance
function calculateShippingCost(distanceMiles: number): {
  openTransport: { low: number; high: number };
  enclosedTransport: { low: number; high: number };
  estimatedDays: { min: number; max: number };
} {
  // Base rates per mile (industry averages)
  const openBasePerMile = 0.58;
  const enclosedBasePerMile = 0.85;

  // Minimum charges
  const openMinimum = 350;
  const enclosedMinimum = 600;

  // Calculate costs
  let openLow = Math.max(openMinimum, distanceMiles * openBasePerMile * 0.85);
  let openHigh = Math.max(openMinimum, distanceMiles * openBasePerMile * 1.15);
  let enclosedLow = Math.max(enclosedMinimum, distanceMiles * enclosedBasePerMile * 0.85);
  let enclosedHigh = Math.max(enclosedMinimum, distanceMiles * enclosedBasePerMile * 1.15);

  // Round to nearest $25
  openLow = Math.round(openLow / 25) * 25;
  openHigh = Math.round(openHigh / 25) * 25;
  enclosedLow = Math.round(enclosedLow / 25) * 25;
  enclosedHigh = Math.round(enclosedHigh / 25) * 25;

  // Estimate delivery days (avg 500 miles per day for transport trucks)
  const avgDailyMiles = 500;
  const minDays = Math.max(2, Math.ceil(distanceMiles / (avgDailyMiles * 1.2)));
  const maxDays = Math.max(3, Math.ceil(distanceMiles / (avgDailyMiles * 0.7)));

  return {
    openTransport: { low: openLow, high: openHigh },
    enclosedTransport: { low: enclosedLow, high: enclosedHigh },
    estimatedDays: { min: minDays, max: maxDays },
  };
}

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { originZip, destinationZip } = body;

    if (!originZip || !destinationZip) {
      return NextResponse.json(
        { error: "Both originZip and destinationZip are required" },
        { status: 400 }
      );
    }

    // Clean zip codes (take first 5 digits)
    const cleanOrigin = originZip.replace(/\D/g, "").substring(0, 5);
    const cleanDestination = destinationZip.replace(/\D/g, "").substring(0, 5);

    if (cleanOrigin.length < 3 || cleanDestination.length < 3) {
      return NextResponse.json(
        { error: "Invalid zip code format" },
        { status: 400 }
      );
    }

    const distance = calculateDistance(cleanOrigin, cleanDestination);

    if (distance === null) {
      return NextResponse.json(
        { error: "Unable to calculate distance for provided zip codes" },
        { status: 400 }
      );
    }

    const estimate = calculateShippingCost(distance);

    return NextResponse.json({
      originZip: cleanOrigin,
      destinationZip: cleanDestination,
      distanceMiles: Math.round(distance),
      openTransport: estimate.openTransport,
      enclosedTransport: estimate.enclosedTransport,
      estimatedDays: estimate.estimatedDays,
    });
  } catch (error) {
    console.error("Failed to calculate shipping:", error);
    return NextResponse.json(
      { error: "Failed to calculate shipping estimate" },
      { status: 500 }
    );
  }
}
