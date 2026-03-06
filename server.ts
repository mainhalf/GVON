import express from "express";
import { createServer as createViteServer } from "vite";
import Database from "better-sqlite3";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const db = new Database("observation_network.db");

// Initialize Database Schema
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE,
    password TEXT,
    role TEXT, -- admin, partner, paid, free
    organization TEXT,
    permissions TEXT -- JSON string
  );

  CREATE TABLE IF NOT EXISTS networks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name_cn TEXT,
    name_en TEXT
  );

  CREATE TABLE IF NOT EXISTS sub_networks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    network_id INTEGER,
    code TEXT,
    name_cn TEXT,
    name_en TEXT,
    organization TEXT,
    build_time TEXT,
    data_start_time TEXT,
    coverage TEXT,
    share_type TEXT, -- public, own, partner
    station_count INTEGER,
    main_params TEXT,
    qc_standard TEXT,
    FOREIGN KEY(network_id) REFERENCES networks(id)
  );

  CREATE TABLE IF NOT EXISTS stations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    sub_network_id INTEGER,
    name_cn TEXT,
    name_en TEXT,
    organization TEXT,
    lat REAL,
    lng REAL,
    build_time TEXT,
    data_start_time TEXT,
    main_params TEXT,
    instrument_count INTEGER,
    instrument_codes TEXT,
    continent TEXT,
    country TEXT,
    province TEXT,
    city TEXT,
    county TEXT,
    FOREIGN KEY(sub_network_id) REFERENCES sub_networks(id)
  );

  CREATE TABLE IF NOT EXISTS instruments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    station_id INTEGER,
    code TEXT,
    name_cn TEXT,
    name_en TEXT,
    principle TEXT,
    brand_model TEXT,
    install_year INTEGER,
    admin_contact TEXT,
    update_frequency TEXT,
    params TEXT,
    data_start_time TEXT,
    status TEXT DEFAULT 'normal', -- normal, abnormal
    FOREIGN KEY(station_id) REFERENCES stations(id)
  );

  CREATE TABLE IF NOT EXISTS data_products (
    id TEXT PRIMARY KEY,
    station_id INTEGER,
    name TEXT,
    time_range TEXT,
    price REAL,
    type TEXT, -- hourly, daily, monthly
    FOREIGN KEY(station_id) REFERENCES stations(id)
  );

  CREATE TABLE IF NOT EXISTS observation_data (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    instrument_id INTEGER,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    value REAL,
    param_name TEXT,
    version TEXT,
    FOREIGN KEY(instrument_id) REFERENCES instruments(id)
  );

  CREATE TABLE IF NOT EXISTS user_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    action TEXT,
    details TEXT,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(user_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS purchased_data (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    station_id INTEGER,
    instrument_id INTEGER,
    data_range TEXT,
    purchase_time DATETIME DEFAULT CURRENT_TIMESTAMP,
    price REAL,
    FOREIGN KEY(user_id) REFERENCES users(id),
    FOREIGN KEY(station_id) REFERENCES stations(id),
    FOREIGN KEY(instrument_id) REFERENCES instruments(id)
  );
`);

// Seed initial data if empty
const userCount = db.prepare("SELECT COUNT(*) as count FROM users").get() as { count: number };
if (userCount.count === 0) {
  db.prepare("INSERT INTO users (username, password, role, organization) VALUES (?, ?, ?, ?)").run("admin", "admin123", "admin", "总管理机构");
  db.prepare("INSERT INTO users (username, password, role, organization) VALUES (?, ?, ?, ?)").run("user1", "pass123", "paid", "个人研究者");
  
    const networks = [
      { cn: "空气质量地面浓度监测网络", en: "Surface Air Quality Monitoring Network" },
      { cn: "温室气体监测网络", en: "Greenhouse Gas Monitoring Network" },
      { cn: "水质监测网络", en: "Water Quality Monitoring Network" },
      { cn: "生态质量监测网络", en: "Ecological Quality Monitoring Network" },
      { cn: "噪声监测网络", en: "Noise Monitoring Network" }
    ];
    networks.forEach(n => {
      db.prepare("INSERT INTO networks (name_cn, name_en) VALUES (?, ?)").run(n.cn, n.en);
    });

    // Add sample sub-networks based on images
    const subNetworks = [
      { nid: 1, code: 'AQ-OpenAQ', cn: 'OpenAQ 全球空气质量网', en: 'OpenAQ Global Air Quality', org: 'OpenAQ', share: 'public', count: 15000, params: 'PM2.5, PM10, NO2, O3, CO, SO2, BC' },
      { nid: 1, code: 'AQ-EPA', cn: 'EPA AirNow 美国监测网', en: 'EPA AirNow', org: 'US EPA', share: 'public', count: 3000, params: 'PM2.5, PM10, NO2, O3, CO, SO2' },
      { nid: 1, code: 'AQ-CNEMC', cn: '中国环境监测总站网络', en: 'CNEMC Network', org: '中国环境监测总站', share: 'public', count: 3000, params: 'PM2.5, PM10, O3, NO2, SO2, CO' },
      { nid: 1, code: 'AQ-EU', cn: '欧盟环境署空气质量网', en: 'EEA Air Quality', org: 'EEA', share: 'public', count: 4500, params: 'PM2.5, PM10, O3, NO2' },
      { nid: 2, code: 'GHG-WDCGG', cn: 'WDCGG 世界温室气体数据中心', en: 'WDCGG', org: 'WMO', share: 'public', count: 544, params: 'CO2, CH4, N2O, SF6, CO' },
      { nid: 2, code: 'GHG-TCCON', cn: 'TCCON 国际合作太阳傅里叶变换光谱观测网', en: 'TCCON', org: 'GCOS', share: 'public', count: 34, params: 'CO2, CH4, N2O, HF, CO, H2O' },
      { nid: 2, code: 'GHG-ICOS', cn: 'ICOS 欧洲集成碳观测系统', en: 'ICOS', org: 'ICOS ERIC', share: 'public', count: 140, params: 'CO2, CH4, CO' },
      { nid: 3, code: 'WQ-CN', cn: '中国国家地表水水质自动监测系统', en: 'China National Surface Water Monitoring', org: '中国环境监测总站', share: 'public', count: 2000, params: '水温, pH, 溶解氧, 电导率, 浊度, 高锰酸盐指数, 氨氮, 总磷, 总氮' },
      { nid: 3, code: 'WQ-USGS', cn: 'USGS 美国水质监测网', en: 'USGS Water Quality', org: 'USGS', share: 'public', count: 5000, params: 'pH, 溶解氧, 浊度, 硝酸盐' },
      { nid: 4, code: 'ECO-LTER', cn: 'LTER 长期生态研究网络', en: 'LTER', org: 'NSF', share: 'public', count: 28, params: '生物量, 土壤养分, 气象因子' },
      { nid: 5, code: 'NOISE-EU', cn: '欧盟城市噪声监测网', en: 'EU Urban Noise', org: 'EEA', share: 'public', count: 1200, params: 'Lden, Lnight' }
    ];

    subNetworks.forEach(sn => {
      db.prepare(`INSERT INTO sub_networks (network_id, code, name_cn, name_en, organization, share_type, station_count, main_params) 
                  VALUES (?, ?, ?, ?, ?, ?, ?, ?)`).run(sn.nid, sn.code, sn.cn, sn.en, sn.org, sn.share, sn.count, sn.params);
    });
    
    // Add sample stations
    const sampleStations = [
      { sub_id: 3, cn: '北京奥体中心站', en: 'Beijing Olympic Sports Center', org: '北京环保局', lat: 39.982, lng: 116.397 },
      { sub_id: 3, cn: '上海徐家汇站', en: 'Shanghai Xujiahui Station', org: '上海气象局', lat: 31.192, lng: 121.434 },
      { sub_id: 4, cn: '冒纳罗亚观测站', en: 'Mauna Loa Observatory', org: 'NOAA', lat: 19.536, lng: -155.576 },
      { sub_id: 4, cn: '瓦里关山站', en: 'Mt. Waliguan', org: '中国气象局', lat: 36.287, lng: 100.896 },
      { sub_id: 5, cn: '南极中山站', en: 'Zhongshan Station', org: '极地研究中心', lat: -69.373, lng: 76.372 },
      { sub_id: 2, cn: '纽约中央公园站', en: 'Central Park Station', org: 'EPA', lat: 40.785, lng: -73.968 },
      { sub_id: 1, cn: '伦敦海德公园站', en: 'Hyde Park Station', org: 'Defra', lat: 51.507, lng: -0.165 },
      { sub_id: 1, cn: '悉尼歌剧院站', en: 'Sydney Opera House', org: 'NSW EPA', lat: -33.856, lng: 151.215 },
      { sub_id: 1, cn: '开普敦站', en: 'Cape Town Station', org: 'SAWS', lat: -33.924, lng: 18.423 },
      { sub_id: 3, cn: '成都武侯站', en: 'Wuhou Station', org: '成都环保局', lat: 30.631, lng: 104.043 },
      { sub_id: 1, cn: '东京新宿站', en: 'Shinjuku Station', org: 'JMA', lat: 35.689, lng: 139.700 },
      { sub_id: 1, cn: '巴黎埃菲尔站', en: 'Eiffel Tower Station', org: 'Airparif', lat: 48.858, lng: 2.294 },
      { sub_id: 1, cn: '里约热内卢站', en: 'Rio de Janeiro Station', org: 'INEA', lat: -22.906, lng: -43.172 },
      { sub_id: 1, cn: '内罗毕站', en: 'Nairobi Station', org: 'KMD', lat: -1.292, lng: 36.821 },
      { sub_id: 6, cn: '杭州西湖站', en: 'West Lake Station', org: '杭州环保局', lat: 30.241, lng: 120.148 },
      { sub_id: 6, cn: '苏州太湖站', en: 'Taihu Lake Station', org: '江苏环保厅', lat: 31.214, lng: 120.356 },
      { sub_id: 6, cn: '武汉东湖站', en: 'East Lake Station', org: '武汉水务局', lat: 30.556, lng: 114.389 },
      { sub_id: 7, cn: '洛杉矶圣莫尼卡站', en: 'Santa Monica Station', org: 'USGS', lat: 34.019, lng: -118.491 },
      { sub_id: 7, cn: '旧金山金门站', en: 'Golden Gate Station', org: 'USGS', lat: 37.808, lng: -122.475 },
      { sub_id: 7, cn: '西雅图普吉特湾站', en: 'Puget Sound Station', org: 'USGS', lat: 47.606, lng: -122.332 },
      { sub_id: 8, cn: '长白山生态站', en: 'Changbai Mountain Station', org: '中科院', lat: 42.402, lng: 128.102 },
      { sub_id: 8, cn: '西双版纳热带雨林站', en: 'Xishuangbanna Station', org: '中科院', lat: 21.925, lng: 101.258 },
      { sub_id: 8, cn: '鼎湖山生态站', en: 'Dinghushan Station', org: '中科院', lat: 23.167, lng: 112.533 },
      { sub_id: 9, cn: '柏林中心噪声站', en: 'Berlin Center Noise', org: 'EEA', lat: 52.520, lng: 13.404 },
      { sub_id: 9, cn: '巴黎香榭丽舍噪声站', en: 'Paris Champs-Élysées Noise', org: 'Airparif', lat: 48.870, lng: 2.308 },
      { sub_id: 9, cn: '罗马斗兽场噪声站', en: 'Rome Colosseum Noise', org: 'ISPRA', lat: 41.890, lng: 12.492 }
    ];

    sampleStations.forEach(s => {
      db.prepare(`INSERT INTO stations (sub_network_id, name_cn, name_en, organization, lat, lng, build_time, data_start_time, main_params, instrument_count, instrument_codes, continent, country, province, city, county) 
                  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(
                    s.sub_id, s.cn, s.en, s.org, s.lat, s.lng, 
                    '2015-06-01', '2015-07-01', 'PM2.5, PM10, O3', 
                    2, `INST-${s.sub_id}-1, INST-${s.sub_id}-2`,
                    'asia', 'china', 'beijing', '北京市', 'chaoyang'
                  );
    });

    // Add sample instruments and historical data
    const stationCount = db.prepare("SELECT COUNT(*) as count FROM stations").get() as { count: number };
    for (let i = 1; i <= stationCount.count; i++) {
      const station = db.prepare("SELECT * FROM stations WHERE id = ?").get(i) as any;
      const subNet = db.prepare("SELECT * FROM sub_networks WHERE id = ?").get(station.sub_network_id) as any;
      if (!subNet) continue;
      
      const params = (subNet.main_params || '').split(', ').filter(Boolean);
      const mainParam = params[0] || '未知';

      // Add 2 instruments per station
      for (let j = 1; j <= 2; j++) {
        const instCode = `INST-${station.id}-${j}`;
        db.prepare(`INSERT INTO instruments (station_id, code, name_cn, name_en, principle, brand_model, install_year, admin_contact, update_frequency, params, data_start_time) 
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(
                      i, 
                      instCode, 
                      `${mainParam}分析仪 ${j}号`, 
                      `${mainParam} Analyzer #${j}`, 
                      '光学吸收法', 
                      'GVON-X1', 
                      2022, 
                      'admin@gvon.org',
                      '1小时',
                      subNet.main_params,
                      '2022-01-01'
                    );
      }

      // Add data products for each station
      const products = [
        { id: `PROD-${i}-H`, name: '逐小时高精度资料包', range: '最近30天', price: 99.00, type: 'hourly' },
        { id: `PROD-${i}-D`, name: '逐日统计资料包', range: '最近1年', price: 299.00, type: 'daily' },
        { id: `PROD-${i}-M`, name: '逐月气候态资料包', range: '历史全量', price: 999.00, type: 'monthly' }
      ];
      products.forEach(p => {
        db.prepare("INSERT INTO data_products (id, station_id, name, time_range, price, type) VALUES (?, ?, ?, ?, ?, ?)").run(p.id, i, p.name, p.range, p.price, p.type);
      });
      
      // Generate 24 hours of mock data for the first instrument
      const inst = db.prepare("SELECT id FROM instruments WHERE station_id = ? LIMIT 1").get(i) as any;
      const stmt = db.prepare("INSERT INTO observation_data (instrument_id, timestamp, value, param_name) VALUES (?, ?, ?, ?)");
      for (let h = 0; h < 24; h++) {
        const time = new Date();
        time.setHours(time.getHours() - h);
        let val = 0;
        if (mainParam === 'PM2.5') val = 10 + Math.random() * 50;
        else if (mainParam === 'CO2') val = 400 + Math.random() * 20;
        else if (mainParam === '水温') val = 15 + Math.random() * 10;
        else val = Math.random() * 100;

        stmt.run(inst.id, time.toISOString(), val, mainParam);
      }
    }

    // Add some initial purchased data for admin (user_id: 1)
    db.prepare(`INSERT INTO purchased_data (user_id, station_id, instrument_id, data_range, price) VALUES (?, ?, ?, ?, ?)`).run(1, 1, 1, '逐小时高精度资料包 (2024-01)', 99.00);
    db.prepare(`INSERT INTO purchased_data (user_id, station_id, instrument_id, data_range, price) VALUES (?, ?, ?, ?, ?)`).run(1, 2, 3, '逐日统计资料包 (2023)', 299.00);
    db.prepare(`INSERT INTO purchased_data (user_id, station_id, instrument_id, data_range, price) VALUES (?, ?, ?, ?, ?)`).run(1, 4, 7, '历史全量温室气体数据', 999.00);
  }

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API Routes
  app.get("/api/networks", (req, res) => {
    const rows = db.prepare("SELECT * FROM networks").all();
    res.json(rows);
  });

  app.get("/api/stations", (req, res) => {
    const rows = db.prepare(`
      SELECT s.*, n.name_cn as network_name_cn 
      FROM stations s
      JOIN sub_networks sn ON s.sub_network_id = sn.id
      JOIN networks n ON sn.network_id = n.id
    `).all();
    res.json(rows);
  });

  app.get("/api/stations/:id/data", (req, res) => {
    const { id } = req.params;
    const rows = db.prepare(`
      SELECT d.* FROM observation_data d
      JOIN instruments i ON d.instrument_id = i.id
      WHERE i.station_id = ?
      ORDER BY d.timestamp DESC
      LIMIT 100
    `).all(id);
    res.json(rows);
  });

  app.get("/api/stations/:id/instruments", (req, res) => {
    const { id } = req.params;
    const rows = db.prepare("SELECT * FROM instruments WHERE station_id = ?").all(id);
    res.json(rows);
  });

  app.get("/api/stations/:id/products", (req, res) => {
    const { id } = req.params;
    const rows = db.prepare("SELECT * FROM data_products WHERE station_id = ?").all(id);
    res.json(rows);
  });

  app.get("/api/user/:id/purchases", (req, res) => {
    const { id } = req.params;
    const rows = db.prepare(`
      SELECT p.*, s.name_cn as station_name, i.name_cn as instrument_name 
      FROM purchased_data p
      JOIN stations s ON p.station_id = s.id
      JOIN instruments i ON p.instrument_id = i.id
      WHERE p.user_id = ?
    `).all(id);
    res.json(rows);
  });

  app.post("/api/purchase", (req, res) => {
    const { user_id, station_id, instrument_id, data_range, price } = req.body;
    db.prepare(`
      INSERT INTO purchased_data (user_id, station_id, instrument_id, data_range, price)
      VALUES (?, ?, ?, ?, ?)
    `).run(user_id, station_id, instrument_id, data_range, price);
    res.json({ success: true });
  });

  app.get("/api/stats/overview", (req, res) => {
    const stats = {
      networks: db.prepare("SELECT COUNT(*) as count FROM networks").get(),
      stations: db.prepare("SELECT COUNT(*) as count FROM stations").get(),
      instruments: db.prepare("SELECT COUNT(*) as count FROM instruments").get(),
      users: db.prepare("SELECT COUNT(*) as count FROM users").get(),
      abnormal_instruments: db.prepare("SELECT COUNT(*) as count FROM instruments WHERE status != 'normal'").get()
    };
    res.json(stats);
  });

  // Auth mock (for demo purposes)
  app.post("/api/login", (req, res) => {
    const { username, password } = req.body;
    const user = db.prepare("SELECT * FROM users WHERE username = ? AND password = ?").get(username, password) as any;
    if (user) {
      res.json({ id: user.id, username: user.username, role: user.role, organization: user.organization });
    } else {
      res.status(401).json({ error: "Invalid credentials" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, "dist")));
    app.get("*", (req, res) => {
      res.sendFile(path.join(__dirname, "dist", "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
