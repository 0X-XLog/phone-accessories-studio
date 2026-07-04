-- Phone Accessories Selling Points Seed Data

-- Phone Case
INSERT INTO pa_selling_points (category, point_en, point_ms, point_zh, point_image_prompt, priority) VALUES
('phone_case', 'Shockproof & Drop Protection', 'Pelindung Hentaman & Anti Jatuh', '防摔防跌保护', 'Phone case surviving a drop test, product demo shot', 10),
('phone_case', 'Anti-Fingerprint Matte Finish', 'Finishing Matte Anti Sidik Jari', '防指纹磨砂工艺', 'Close-up of matte surface texture showing no fingerprint marks', 9),
('phone_case', 'Ultra Slim & Lightweight Design', 'Rekaan Slim & Ringan', '超薄轻量设计', 'Side profile showing ultra-thin phone case on clean background', 8),
('phone_case', 'Camera Lens Protection', 'Pelindungan Kanta Kamera', '镜头保护设计', 'Close-up of raised camera bezel protecting lens, macro detail shot', 7),
('phone_case', 'MagSafe Compatible', 'Serasi MagSafe', 'MagSafe磁吸兼容', 'Phone case with MagSafe charger attached, wireless charging demo', 6),
('phone_case', 'Crystal Clear & Anti-Yellowing', 'Jernih & Anti Kekuningan', '透明防发黄', 'Clear transparent case showing phone color, crystal clear product shot', 5),
('phone_case', 'Full Body 360° Protection', 'Perlindungan 360° Seluruh Badan', '360度全面保护', '360 degree view of phone case covering all edges and corners', 4),
('phone_case', 'Precise Cutouts & Easy Access', 'Potongan Tepat & Akses Mudah', '精准开孔易操作', 'Close-up of precise port cutouts showing easy cable access', 3);

-- Earbuds
INSERT INTO pa_selling_points (category, point_en, point_ms, point_zh, point_image_prompt, priority) VALUES
('earbuds', 'Active Noise Cancellation (ANC)', 'Pembatalan Bunyi Aktif (ANC)', '主动降噪ANC', 'Person in noisy environment with earbuds, peaceful expression, noise blocked', 10),
('earbuds', 'Low Latency Gaming Mode', 'Mod Permainan Kelewatan Rendah', '低延迟游戏模式', 'Earbuds with gaming setup, RGB lighting, low latency gaming scene', 9),
('earbuds', 'Long Battery Life 30H', 'Bateri Tahan Lama 30H', '30小时长续航', 'Earbuds in charging case with battery indicator, 30-hour display', 8),
('earbuds', 'HD Clear Calling', 'Panggilan HD Jernih', '高清通话清晰', 'Person making a phone call with earbuds, clear communication scene', 7),
('earbuds', 'Touch Control', 'Kawalan Sentuh', '触控操作', 'Close-up of finger tapping earbud touch control surface', 6),
('earbuds', 'IPX5 Waterproof & Sweatproof', 'Kalis Air IPX5 & Peluh', 'IPX5防水防汗', 'Earbuds with water splash effect, workout scene, droplets on product', 5),
('earbuds', 'Deep Bass Boost', 'Bass Dalam Tinggi', '深沉低音增强', 'Sound wave visualization from earbuds, colorful equalizer visual', 4),
('earbuds', 'Bluetooth 5.3 Stable Connection', 'Sambungan Stabil Bluetooth 5.3', '蓝牙5.3稳定连接', 'Earbuds connecting to phone, wireless signal visualization, tech shot', 3);

-- Phone Holder / Stand
INSERT INTO pa_selling_points (category, point_en, point_ms, point_zh, point_image_prompt, priority) VALUES
('holder', '360° Rotation & Adjustable Angle', 'Putaran 360° & Sudut Boleh Laras', '360度旋转可调角度', 'Phone holder showing multiple rotation angles, adjustable demonstration', 10),
('holder', 'Strong Magnetic Grip', 'Cengkaman Magnet Kuat', '强磁力吸附', 'Phone snapping onto magnetic holder, one-hand operation demo', 9),
('holder', 'One-Hand Operation', 'Operasi Satu Tangan', '单手操作', 'One hand easily placing and removing phone from holder', 8),
('holder', 'Stable & Anti-Shake', 'Stabil & Anti Goyah', '稳固防抖', 'Phone on holder on bumpy road, staying firmly in place', 7),
('holder', 'Foldable & Portable', 'Boleh Lipat & Mudah Alih', '可折叠便携', 'Holder in collapsed and expanded state comparison, portability showcase', 6),
('holder', 'Dashboard / Air Vent / Windshield Mount', 'Pemasangan Dashboard / Lubang Angin / Cermin', '仪表盘/出风口/挡风玻璃安装', 'Three mounting positions shown, dashboard + air vent + windshield', 5);

-- Cable
INSERT INTO pa_selling_points (category, point_en, point_ms, point_zh, point_image_prompt, priority) VALUES
('cable', 'PD 65W Fast Charging', 'Pengecas Pantas PD 65W', 'PD 65W快充', 'Cable with energy flow visualization, phone battery percentage increasing rapidly', 10),
('cable', 'Durable Braided Nylon Jacket', 'Salut Nylon Anyaman Tahan Lama', '尼龙编织耐用', 'Close-up of braided nylon cable texture, bending demonstration, premium feel', 9),
('cable', 'High Speed Data Transfer', 'Pemindahan Data Kelajuan Tinggi', '高速数据传输', 'Cable connecting phone to laptop, data transfer speed visualization', 8),
('cable', '1m / 2m Length Options', 'Pilihan Panjang 1m / 2m', '1m/2m长度可选', 'Cables in different lengths laid out together, size comparison', 7),
('cable', 'MFi Certified (Lightning)', 'Bersijil MFi (Lightning)', 'MFi认证Lightning接口', 'MFi certification badge displayed, Apple compatibility assurance', 6),
('cable', 'Anti-Tangle Design', 'Rekaan Anti Kusut', '防缠绕设计', 'Cable shown untangled and neat, anti-tangle feature demonstration', 5);

-- Charger
INSERT INTO pa_selling_points (category, point_en, point_ms, point_zh, point_image_prompt, priority) VALUES
('charger', '65W/100W Fast Charging', 'Pengecas Pantas 65W/100W', '65W/100W快充', 'Charger with multiple devices charging, speed lines, fast charging visualization', 10),
('charger', 'Multiple Ports (USB-C + USB-A)', 'Pelabuhan Pelbagai (USB-C + USB-A)', '多接口USB-C+USB-A', 'Charger showing multiple ports, several devices connected simultaneously', 9),
('charger', 'Compact & Travel-Friendly', 'Kompak & Mesra Travel', '小巧便携旅行友好', 'Charger in palm of hand showing compact size, compared to coin for scale', 8),
('charger', 'LED Charging Indicator', 'Penunjuk Pengecasan LED', 'LED充电指示灯', 'Close-up of charger LED indicator showing charging status, blue/green light', 7),
('charger', 'Overcharge Protection', 'Perlindungan Pengecasan Berlebih', '过充保护', 'Safety feature visualization, circuit protection diagram on clean background', 6);

-- USB Fan
INSERT INTO pa_selling_points (category, point_en, point_ms, point_zh, point_image_prompt, priority) VALUES
('fan', 'Quiet Motor (≤30dB)', 'Motor Senyap (≤30dB)', '静音电机≤30dB', 'USB fan on desk in quiet office, peaceful atmosphere, low noise level indicator', 10),
('fan', '360° Adjustable Angle', 'Sudut Boleh Laras 360°', '360度可调角度', 'Fan showing multiple angle positions, flexible head rotation', 9),
('fan', 'USB-C Powered', 'Dikuasakan USB-C', 'USB-C供电', 'Fan plugged into USB-C port on laptop, power source demonstration', 8),
('fan', '3-Speed Wind Control', 'Kawalan Angin 3 Kelajuan', '3档风速调节', 'Fan with speed level indicator showing 3 settings, wind visualization', 7),
('fan', 'Portable & Clip-On Design', 'Mudah Alih & Rekaan Kekuang', '便携夹扣设计', 'Fan clipped to desk edge, showing clip-on mechanism, portable use', 6);

-- Phone Stand
INSERT INTO pa_selling_points (category, point_en, point_ms, point_zh, point_image_prompt, priority) VALUES
('stand', 'Adjustable Viewing Angle', 'Sudut Tontonan Boleh Laras', '可调观看角度', 'Phone stand showing multiple viewing angles, ergonomic positioning', 10),
('stand', 'Foldable & Pocket-Sized', 'Boleh Lipat & Saiz Poket', '可折叠口袋大小', 'Stand collapsed and expanded comparison, fits in pocket, portability showcase', 9),
('stand', 'Anti-Slip Silicone Base', 'Tapak Silikon Anti Slip', '防滑硅胶底座', 'Close-up of anti-slip silicone base, phone standing firmly without wobbling', 8),
('stand', 'Aluminum Alloy Premium Build', 'Binaan Aloi Aluminium Premium', '铝合金高端材质', 'Premium aluminum material detail shot, metallic texture, product photography', 7),
('stand', 'Cable Management Slot', 'Slot Pengurusan Kabel', '线缆管理槽', 'Phone on stand with cable routed through built-in cable slot, clean desk setup', 6);

-- Car Mount
INSERT INTO pa_selling_points (category, point_en, point_ms, point_zh, point_image_prompt, priority) VALUES
('car_mount', 'Strong Magnetic Adsorption', 'Penjerapan Magnet Kuat', '强力磁吸', 'Phone snapping onto magnetic mount with satisfying click, one-hand operation', 10),
('car_mount', '360° Rotation Navigation', 'Navigasi Putaran 360°', '360度旋转导航', 'Car mount showing phone in landscape and portrait mode for GPS navigation', 9),
('car_mount', 'One-Hand Quick Release', 'Pelepasan Pantas Satu Tangan', '单手快速取放', 'One hand easily placing and removing phone from car mount while driving', 8),
('car_mount', 'Stable on Bumpy Roads', 'Stabil di Jalan Bergelombang', '颠簸路段稳固', 'Car mount on dashboard with bumpy road, phone staying firmly in place', 7),
('car_mount', 'Dashboard / Air Vent / Windshield', 'Dashboard / Lubang Angin / Cermin', '仪表盘/出风口/挡风玻璃安装', 'Three mounting options shown, dashboard + air vent + windshield positions', 6);

-- Power Bank
INSERT INTO pa_selling_points (category, point_en, point_ms, point_zh, point_image_prompt, priority) VALUES
('power_bank', '10000mAh / 20000mAh High Capacity', 'Kapasiti Tinggi 10000mAh / 20000mAh', '10000mAh/20000mAh大容量', 'Power bank with battery capacity indicator showing full charge, capacity visualization', 10),
('power_bank', '22.5W Fast Charging Output', 'Output Pengecasan Pantas 22.5W', '22.5W快充输出', 'Power bank charging phone rapidly, energy flow visualization, fast charging speed', 9),
('power_bank', 'Compact & Lightweight', 'Kompak & Ringan', '小巧轻便', 'Power bank in hand or pocket showing slim compact design, travel-friendly', 8),
('power_bank', 'LED Digital Display', 'Paparan Digital LED', 'LED数字显示屏', 'Close-up of LED display showing remaining battery percentage, clear digital readout', 7),
('power_bank', 'Dual USB + Type-C Output', 'Output Dual USB + Type-C', '双USB+Type-C输出', 'Power bank with multiple ports charging two devices simultaneously', 6),
('power_bank', 'Wireless Charging Support', 'Sokongan Pengecasan Tanpa Wayar', '支持无线充电', 'Phone placed on power bank wirelessly charging, wireless charging indicator', 5);
