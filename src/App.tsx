import React, { useState, useEffect } from 'react';
import { 
  LayoutDashboard, 
  Network as NetworkIcon, 
  MapPin, 
  Activity, 
  Users, 
  Settings, 
  LogOut, 
  Search, 
  Plus, 
  Bell,
  Globe,
  Database,
  BarChart3,
  AlertTriangle,
  ChevronRight,
  Menu,
  X,
  User as UserIcon,
  Download,
  CreditCard,
  History,
  Info,
  Layers,
  Wallet,
  FileText,
  PieChart as PieChartIcon,
  UserCog,
  ChevronDown,
  Compass,
  ChevronUp,
  Wind,
  Droplets,
  Volume2,
  Leaf
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  PieChart, Pie, Cell, LineChart, Line, AreaChart, Area
} from 'recharts';
import * as d3 from 'd3-geo';
import { cn } from './lib/utils';
import { User, Network, SubNetwork, Station, Instrument, ObservationData, PurchasedData, StationDataProduct } from './types';

// --- Components ---

const SidebarItem = ({ icon: Icon, label, active, onClick }: { icon: any, label: string, active?: boolean, onClick: () => void }) => (
  <button
    onClick={onClick}
    className={cn(
      "flex items-center w-full gap-3 px-4 py-3 text-sm font-medium transition-all duration-200 rounded-lg group",
      active 
        ? "bg-emerald-500/10 text-emerald-400 border-r-2 border-emerald-500" 
        : "text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100"
    )}
  >
    <Icon className={cn("w-5 h-5", active ? "text-emerald-400" : "text-zinc-500 group-hover:text-zinc-300")} />
    {label}
  </button>
);

const StatCard = ({ label, value, icon: Icon, trend, color }: { label: string, value: string | number, icon: any, trend?: string, color: string }) => (
  <div className="p-6 border bg-white border-slate-200 rounded-2xl shadow-sm">
    <div className="flex items-start justify-between">
      <div>
        <p className="text-[10px] font-bold tracking-wider uppercase text-slate-400">{label}</p>
        <h3 className="mt-2 text-3xl font-black text-slate-900">{value}</h3>
        {trend && (
          <p className={cn("mt-2 text-xs font-bold", trend.startsWith('+') ? "text-emerald-600" : "text-rose-600")}>
            {trend} <span className="text-slate-400 font-medium">较上月</span>
          </p>
        )}
      </div>
      <div className={cn("p-3 rounded-xl shadow-lg shadow-current/10", color)}>
        <Icon className="w-6 h-6 text-white" />
      </div>
    </div>
  </div>
);

// --- Main App ---

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [activeTab, setActiveTab] = useState('map');
  const [mgmtTab, setMgmtTab] = useState('dashboard');
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isLegendExpanded, setIsLegendExpanded] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [stats, setStats] = useState<any>(null);
  const [stations, setStations] = useState<Station[]>([]);
  const [networks, setNetworks] = useState<Network[]>([]);
  const [selectedStation, setSelectedStation] = useState<Station | null>(null);
  const [stationData, setStationData] = useState<ObservationData[]>([]);
  const [purchasedData, setPurchasedData] = useState<PurchasedData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isPurchasing, setIsPurchasing] = useState(false);
  const [geoJsonData, setGeoJsonData] = useState<any>(null);
  const [selectedNetworkId, setSelectedNetworkId] = useState<number | null>(null);
  const [mapTransform, setMapTransform] = useState({ x: 0, y: 0, k: 1 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  
  const [stationInstruments, setStationInstruments] = useState<Instrument[]>([]);
  const [stationProducts, setStationProducts] = useState<StationDataProduct[]>([]);
  const [isPurchaseModalOpen, setIsPurchaseModalOpen] = useState(false);
  const [selectedProductIds, setSelectedProductIds] = useState<string[]>([]);
  const [selectedRegion, setSelectedRegion] = useState<string[]>(['global']);
  const [expandedRegions, setExpandedRegions] = useState<string[]>(['global']);
  const [isRegionMenuOpen, setIsRegionMenuOpen] = useState(false);

  // Mock login
  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch GeoJSON for world map with timeout
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);
        
        const geoRes = await fetch('https://raw.githubusercontent.com/holtzy/D3-graph-gallery/master/DATA/world.geojson', { signal: controller.signal });
        clearTimeout(timeoutId);
        
        if (geoRes.ok) {
          const data = await geoRes.json();
          setGeoJsonData(data);
        } else {
          throw new Error("Fetch failed");
        }
      } catch (err) {
        console.error("Failed to fetch GeoJSON, using simple fallback:", err);
        // Minimal fallback GeoJSON (just a box for the world)
        setGeoJsonData({
          type: "FeatureCollection",
          features: [
            {
              type: "Feature",
              properties: { name: "World Fallback" },
              geometry: {
                type: "Polygon",
                coordinates: [[[-180, -90], [180, -90], [180, 90], [-180, 90], [-180, -90]]]
              }
            }
          ]
        });
      }
    };
    fetchData();

    const login = async () => {
      try {
        const res = await fetch('/api/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username: 'user1', password: 'pass123' })
        });
        if (res.ok) {
          const data = await res.json();
          setUser(data);
        } else {
          console.error("Login failed with status:", res.status);
        }
      } catch (e) {
        console.error("Login failed", e);
      }
    };
    login();
  }, []);

  useEffect(() => {
    if (user) {
      const fetchData = async () => {
        setIsLoading(true);
        try {
          const [statsRes, stationsRes, networksRes, purchasesRes] = await Promise.all([
            fetch('/api/stats/overview'),
            fetch('/api/stations'),
            fetch('/api/networks'),
            fetch(`/api/user/${user.id}/purchases`)
          ]);
          setStats(await statsRes.json());
          setStations(await stationsRes.json());
          setNetworks(await networksRes.json());
          setPurchasedData(await purchasesRes.json());
        } catch (e) {
          console.error("Fetch failed", e);
        } finally {
          setIsLoading(false);
        }
      };
      fetchData();
    }
  }, [user]);

  const fetchStationData = async (stationId: number) => {
    try {
      const [dataRes, instRes, prodRes] = await Promise.all([
        fetch(`/api/stations/${stationId}/data`),
        fetch(`/api/stations/${stationId}/instruments`),
        fetch(`/api/stations/${stationId}/products`)
      ]);
      setStationData(await dataRes.json());
      setStationInstruments(await instRes.json());
      setStationProducts(await prodRes.json());
    } catch (e) {
      console.error("Fetch station data failed", e);
    }
  };

  const handlePurchase = async (station: Station) => {
    if (!user || selectedProductIds.length === 0) return;
    setIsPurchasing(true);
    try {
      const totalPrice = stationProducts
        .filter(p => selectedProductIds.includes(p.id))
        .reduce((sum, p) => sum + p.price, 0);

      const res = await fetch('/api/purchase', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: user.id,
          station_id: station.id,
          instrument_id: stationInstruments[0]?.id || 1,
          data_range: selectedProductIds.map(id => stationProducts.find(p => p.id === id)?.name).join(', '),
          price: totalPrice
        })
      });
      if (res.ok) {
        const purchasesRes = await fetch(`/api/user/${user.id}/purchases`);
        setPurchasedData(await purchasesRes.json());
        setIsPurchaseModalOpen(false);
        setSelectedProductIds([]);
        alert('购买成功！数据已准备好下载。');
      }
    } catch (e) {
      console.error("Purchase failed", e);
    } finally {
      setIsPurchasing(false);
    }
  };

  if (!user) return (
    <div className="flex items-center justify-center min-h-screen bg-slate-50 text-slate-900">
      <div className="flex flex-col items-center gap-4">
        <Globe className="w-12 h-12 text-emerald-600 animate-pulse" />
        <p className="text-slate-500 font-medium">正在初始化全球虚拟观测网络...</p>
      </div>
    </div>
  );

  const regions = [
    {
      id: 'global',
      name: '全球',
      children: [
        {
          id: 'asia',
          name: '亚洲',
          children: [
            {
              id: 'china',
              name: '中国',
              children: [
                {
                  id: 'beijing',
                  name: '北京市',
                  children: [
                    { id: 'chaoyang', name: '朝阳区' },
                    { id: 'haidian', name: '海淀区' },
                  ]
                },
                {
                  id: 'shanghai',
                  name: '上海市',
                  children: [
                    { id: 'xuhui', name: '徐汇区' },
                    { id: 'pudong', name: '浦东新区' },
                  ]
                }
              ]
            },
            { id: 'japan', name: '日本' },
            { id: 'korea', name: '韩国' },
          ]
        },
        { id: 'africa', name: '非洲' },
        { id: 'north-america', name: '北美洲' },
        { id: 'south-america', name: '南美洲' },
        { id: 'antarctica', name: '南极洲' },
        { id: 'europe', name: '欧洲' },
        { id: 'oceania', name: '大洋洲' },
      ]
    }
  ];

  const toggleRegion = (id: string) => {
    setExpandedRegions(prev => 
      prev.includes(id) ? prev.filter(rid => rid !== id) : [...prev, id]
    );
  };

  const getRegionName = (id: string, items: any[] = regions): string => {
    for (const item of items) {
      if (item.id === id) return item.name;
      if (item.children) {
        const name = getRegionName(id, item.children);
        if (name !== 'Unknown') return name;
      }
    }
    return 'Unknown';
  };

  const renderRegionTree = (items: any[], level = 0) => {
    return items.map(item => (
      <div key={item.id} className="select-none">
        <div 
          className={cn(
            "flex items-center gap-2 py-1.5 px-2 rounded-lg cursor-pointer transition-all group/item",
            selectedRegion.includes(item.id) ? "bg-emerald-50 text-emerald-700" : "hover:bg-slate-50 text-slate-600"
          )}
          style={{ paddingLeft: `${level * 12 + 8}px` }}
          onClick={(e) => {
            e.stopPropagation();
            setSelectedRegion([item.id]);
            if (item.children) {
              toggleRegion(item.id);
            } else {
              setIsRegionMenuOpen(false);
            }
          }}
        >
          {item.children ? (
            <ChevronRight className={cn(
              "w-3 h-3 transition-transform text-slate-400",
              expandedRegions.includes(item.id) && "rotate-90"
            )} />
          ) : (
            <div className="w-3" />
          )}
          <span className="text-[11px] font-bold truncate">{item.name}</span>
        </div>
        {item.children && expandedRegions.includes(item.id) && (
          <div className="mt-0.5">
            {renderRegionTree(item.children, level + 1)}
          </div>
        )}
      </div>
    ));
  };

  const renderMap = () => {
    const width = 1000;
    const height = 500;
    
    // Use Mercator projection for a familiar world map look
    const projection = d3.geoMercator()
      .scale(150)
      .translate([width / 2, height / 1.5]);
    
    const pathGenerator = d3.geoPath().projection(projection);

    const handleWheel = (e: React.WheelEvent) => {
      const delta = e.deltaY > 0 ? 0.9 : 1.1;
      const newK = Math.min(Math.max(mapTransform.k * delta, 0.5), 10);
      setMapTransform(prev => ({ ...prev, k: newK }));
    };

    const handleMouseDown = (e: React.MouseEvent) => {
      setIsDragging(true);
      setDragStart({ x: e.clientX - mapTransform.x, y: e.clientY - mapTransform.y });
    };

    const handleMouseMove = (e: React.MouseEvent) => {
      if (!isDragging) return;
      setMapTransform(prev => ({
        ...prev,
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y
      }));
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    const filteredStations = stations.filter(s => {
      // Filter by Network
      if (selectedNetworkId) {
        const network = networks.find(n => n.id === selectedNetworkId);
        if (s.network_name_cn !== network?.name_cn) return false;
      }
      
      // Filter by Region
      const regionId = selectedRegion[0];
      if (regionId && regionId !== 'global') {
        const match = 
          s.continent === regionId || 
          s.country === regionId || 
          s.province === regionId || 
          s.city === regionId || 
          s.county === regionId;
        if (!match) return false;
      }
      
      return true;
    });

    return (
      <div 
        className="absolute inset-0 overflow-hidden bg-[#f8fafc] select-none"
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        <div className="absolute inset-0 flex items-center justify-center cursor-grab active:cursor-grabbing">
          <svg 
            viewBox={`0 0 ${width} ${height}`} 
            className="w-full h-full object-cover"
          >
            <g transform={`translate(${mapTransform.x}, ${mapTransform.y}) scale(${mapTransform.k})`}>
              {/* Ocean Background */}
              <rect x={-width * 10} y={-height * 10} width={width * 20} height={height * 20} fill="#f8fafc" />
              
              {/* Base World Outline (Permanent Fallback) */}
              <path 
                d="M150,150 L250,150 L250,250 L150,250 Z M400,100 L600,100 L600,300 L400,300 Z M700,200 L850,200 L850,400 L700,400 Z M100,100 Q200,50 300,100 T500,150 T700,100 T900,150 V400 H100 Z" 
                fill="#f1f5f9" 
                stroke="#cbd5e1" 
                strokeWidth={0.5}
                className="opacity-20"
              />
              
              {/* Map Grid / Graticule */}
              <g className="opacity-[0.03]">
                {Array.from({ length: 19 }).map((_, i) => (
                  <line 
                    key={`lat-${i}`} 
                    x1={-width * 10} y1={(height / 18) * i} 
                    x2={width * 10} y2={(height / 18) * i} 
                    stroke="#64748b" strokeWidth={1 / mapTransform.k} 
                  />
                ))}
                {Array.from({ length: 37 }).map((_, i) => (
                  <line 
                    key={`lng-${i}`} 
                    x1={(width / 36) * i} y1={-height * 10} 
                    x2={(width / 36) * i} y2={height * 10} 
                    stroke="#64748b" strokeWidth={1 / mapTransform.k} 
                  />
                ))}
              </g>

              {/* Landmasses */}
              <g>
                {geoJsonData && geoJsonData.features.map((feature: any, i: number) => (
                  <g key={`country-group-${i}`}>
                    <path
                      d={pathGenerator(feature) || ''}
                      fill="#f1f5f9"
                      stroke="#cbd5e1"
                      strokeWidth={0.5 / mapTransform.k}
                      className="transition-colors duration-300 hover:fill-slate-200"
                    />
                    {/* Administrative Labels (Visible at higher zoom) */}
                    {mapTransform.k > 2 && feature.properties?.name && (
                      <text
                        transform={`translate(${pathGenerator.centroid(feature)})`}
                        textAnchor="middle"
                        className="fill-slate-400 font-bold pointer-events-none uppercase tracking-tighter"
                        style={{ fontSize: `${6 / mapTransform.k}px` }}
                      >
                        {feature.properties.name}
                      </text>
                    )}
                  </g>
                ))}
              </g>

              {/* Stations */}
              <g>
                {filteredStations.map((s) => {
                  const coords = projection([s.lng, s.lat]);
                  if (!coords) return null;
                  const [x, y] = coords;
                  const isSelected = selectedStation?.id === s.id;
                  
                  return (
                    <g 
                      key={s.id} 
                      className="cursor-pointer group"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedStation(s);
                        fetchStationData(s.id);
                      }}
                    >
                      {/* Glow Effect */}
                      <circle 
                        cx={x} cy={y} r={(isSelected ? 12 : 6) / mapTransform.k} 
                        fill={isSelected ? '#10b981' : '#10b981'} 
                        fillOpacity={0.3}
                        className="animate-pulse"
                      />
                      {/* Main Dot */}
                      <circle 
                        cx={x} cy={y} r={(isSelected ? 6 : 4) / mapTransform.k} 
                        fill={isSelected ? '#059669' : '#10b981'} 
                        stroke="white"
                        strokeWidth={(isSelected ? 2 : 1.5) / mapTransform.k}
                        className="transition-all duration-300 group-hover:r-6"
                      />
                      {/* Tooltip on hover (SVG version) */}
                      <g className="opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                        <rect 
                          x={x + 8 / mapTransform.k} y={y - 25 / mapTransform.k} 
                          width={(s.name_cn.length * 12 + 20) / mapTransform.k} height={24 / mapTransform.k} 
                          rx={6 / mapTransform.k} fill="white" 
                          className="shadow-xl"
                          style={{ filter: 'drop-shadow(0 4px 6px rgba(0,0,0,0.1))' }}
                        />
                        <text 
                          x={x + 18 / mapTransform.k} y={y - 9 / mapTransform.k} 
                          className="font-bold fill-slate-700"
                          style={{ fontSize: `${10 / mapTransform.k}px` }}
                        >
                          {s.name_cn}
                        </text>
                      </g>
                    </g>
                  );
                })}
              </g>
            </g>
          </svg>

          {!geoJsonData && (
            <div className="absolute inset-0 flex items-center justify-center bg-slate-50/50 backdrop-blur-sm z-10">
              <div className="text-center space-y-4">
                <Globe className="w-12 h-12 text-emerald-600 mx-auto animate-spin-slow" />
                <p className="text-slate-500 text-xs font-bold uppercase tracking-widest">正在加载全球矢量地图...</p>
              </div>
            </div>
          )}
        </div>

        {/* Overlay Controls */}
      <div className="absolute top-8 left-8 space-y-6 z-10 pointer-events-none">
        <div className="pointer-events-auto">
          <h2 className="text-4xl font-black text-slate-900 tracking-tighter uppercase">GVON <span className="text-emerald-600">Live</span></h2>
      
        </div>
        
        <div className="p-4 bg-white/80 backdrop-blur-md border border-slate-200 rounded-2xl max-w-xs shadow-sm pointer-events-auto">
          <p className="text-slate-600 text-xs leading-relaxed">
            当前展示全球 <span className="text-emerald-600 font-bold">{filteredStations.length}</span> 个活跃监测站点。
          </p>
        </div>

        <div className="flex flex-col gap-3 pointer-events-auto group/sidebar">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">活跃网络</p>
          <motion.div 
            className="flex flex-col gap-2 bg-white/80 backdrop-blur-md border border-slate-200 rounded-2xl p-2 shadow-sm overflow-hidden"
            initial={{ width: 48 }}
            whileHover={{ width: 200 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
          >
            <button 
              onClick={() => setSelectedNetworkId(null)}
              className={cn(
                "flex items-center gap-3 h-10 px-3 rounded-xl text-xs font-bold transition-all border shrink-0",
                selectedNetworkId === null 
                  ? "bg-emerald-600 border-emerald-600 text-white shadow-emerald-600/20" 
                  : "bg-transparent border-transparent text-slate-600 hover:bg-slate-50"
              )}
            >
              <Globe className="w-4 h-4 shrink-0" />
              <span className="whitespace-nowrap opacity-0 group-hover/sidebar:opacity-100 transition-opacity duration-200">全部网络</span>
            </button>
            
            {networks.map(n => {
              const getIcon = (name: string) => {
                if (name.includes('空气') || name.includes('温室')) return <Wind className="w-4 h-4 shrink-0" />;
                if (name.includes('水')) return <Droplets className="w-4 h-4 shrink-0" />;
                if (name.includes('噪声') || name.includes('声')) return <Volume2 className="w-4 h-4 shrink-0" />;
                if (name.includes('生态')) return <Leaf className="w-4 h-4 shrink-0" />;
                return <NetworkIcon className="w-4 h-4 shrink-0" />;
              };

              return (
                <button 
                  key={n.id} 
                  onClick={() => setSelectedNetworkId(n.id)}
                  className={cn(
                    "flex items-center gap-3 h-10 px-3 rounded-xl text-xs font-bold transition-all border shrink-0",
                    selectedNetworkId === n.id 
                      ? "bg-emerald-600 border-emerald-600 text-white shadow-emerald-600/20" 
                      : "bg-transparent border-transparent text-slate-600 hover:bg-slate-50"
                  )}
                >
                  {getIcon(n.name_cn)}
                  <span className="whitespace-nowrap opacity-0 group-hover/sidebar:opacity-100 transition-opacity duration-200">{n.name_cn}</span>
                </button>
              );
            })}
          </motion.div>
        </div>
      </div>

      {/* Compass - Top Right */}
      <div className="absolute top-8 right-8 z-10">
        <div className="p-2 bg-white/80 backdrop-blur-md border border-slate-200 rounded-xl shadow-sm">
          <Compass className="w-5 h-5 text-emerald-600" />
        </div>
      </div>

      {/* Collapsible Legend - Bottom Right */}
      <div className="absolute bottom-8 right-8 z-10 flex flex-col items-end gap-3">
        <AnimatePresence>
          {isLegendExpanded && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="p-6 bg-white/90 backdrop-blur-xl border border-slate-200 rounded-3xl shadow-2xl w-72 space-y-6"
            >
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h4 className="text-sm font-black text-slate-900 uppercase tracking-wider">图例说明</h4>
                <span className="text-[10px] text-slate-400 font-bold">LEGEND</span>
              </div>

              {/* Dynamic Legend Content */}
              <div className="space-y-5">
                {(!selectedStation || selectedStation.network_name_cn?.includes('空气') || selectedStation.network_name_cn?.includes('温室气体')) && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-emerald-600">
                      <Wind className="w-4 h-4" />
                      <span className="text-xs font-bold">空气质量监测</span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 pl-6">
                      {['PM2.5', 'PM10', 'O3', 'NO2'].map(item => (
                        <div key={item} className="flex items-center gap-2">
                          <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                          <span className="text-[10px] text-slate-500 font-medium">{item}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {(!selectedStation || selectedStation.network_name_cn?.includes('水')) && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-blue-600">
                      <Droplets className="w-4 h-4" />
                      <span className="text-xs font-bold">水质监测系统</span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 pl-6">
                      {['pH值', '溶解氧', '浊度', '氨氮'].map(item => (
                        <div key={item} className="flex items-center gap-2">
                          <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                          <span className="text-[10px] text-slate-500 font-medium">{item}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {(!selectedStation || selectedStation.network_name_cn?.includes('噪声') || selectedStation.network_name_cn?.includes('声')) && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-amber-600">
                      <Volume2 className="w-4 h-4" />
                      <span className="text-xs font-bold">声环境监测</span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 pl-6">
                      {['昼间噪声', '夜间噪声', 'Ldn', 'Lmax'].map(item => (
                        <div key={item} className="flex items-center gap-2">
                          <div className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                          <span className="text-[10px] text-slate-500 font-medium">{item}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {(!selectedStation || selectedStation.network_name_cn?.includes('生态')) && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-lime-600">
                      <Leaf className="w-4 h-4" />
                      <span className="text-xs font-bold">生态质量监测</span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 pl-6">
                      {['植被指数', '生物量', '土壤水分'].map(item => (
                        <div key={item} className="flex items-center gap-2">
                          <div className="w-1.5 h-1.5 rounded-full bg-lime-500" />
                          <span className="text-[10px] text-slate-500 font-medium">{item}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-[10px] font-bold text-slate-500">实时数据流</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-rose-500" />
                  <span className="text-[10px] font-bold text-slate-500">异常告警</span>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <button
          onClick={() => setIsLegendExpanded(!isLegendExpanded)}
          className="px-3 py-2 bg-emerald-600 text-white rounded-xl shadow-lg shadow-emerald-600/30 hover:bg-emerald-500 transition-all flex items-center gap-2 font-bold text-xs"
        >
          {isLegendExpanded ? <ChevronDown className="w-3 h-3" /> : <ChevronUp className="w-3 h-3" />}
          图例
        </button>
      </div>

      {/* Station Detail Panel */}
      <AnimatePresence>
        {selectedStation && (
          <motion.div
            initial={{ x: 500 }}
            animate={{ x: 0 }}
            exit={{ x: 500 }}
            className="absolute top-0 right-0 h-full w-[450px] bg-white/95 border-l border-slate-200 backdrop-blur-xl overflow-y-auto z-50 shadow-2xl custom-scrollbar"
          >
            <div className="sticky top-0 bg-white/80 backdrop-blur-md z-10 p-6 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="text-xl font-black text-slate-900 tracking-tight">{selectedStation.name_cn}</h3>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">{selectedStation.name_en}</p>
              </div>
              <button onClick={() => setSelectedStation(null)} className="p-2 hover:bg-slate-100 rounded-xl text-slate-400 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-8">
              {/* Basic Info Grid */}
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">归属网络</p>
                  <p className="text-xs font-bold text-emerald-600">{selectedStation.network_name_cn}</p>
                </div>
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">归属机构</p>
                  <p className="text-xs font-bold text-slate-700">{selectedStation.organization}</p>
                </div>
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">经纬度</p>
                  <p className="text-xs font-bold text-slate-700">{selectedStation.lat.toFixed(4)}°, {selectedStation.lng.toFixed(4)}°</p>
                </div>
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">建设时间</p>
                  <p className="text-xs font-bold text-slate-700">{selectedStation.build_time}</p>
                </div>
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">数据起始</p>
                  <p className="text-xs font-bold text-slate-700">{selectedStation.data_start_time}</p>
                </div>
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">仪器数量</p>
                  <p className="text-xs font-bold text-slate-700">{selectedStation.instrument_count} 台</p>
                </div>
              </div>

              {/* Main Params */}
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-slate-500">
                  <Activity className="w-4 h-4" />
                  <span className="text-[10px] font-bold uppercase tracking-widest">主要监测参数</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {(selectedStation.main_params || '').split(', ').filter(Boolean).map(p => (
                    <span key={p} className="px-3 py-1 bg-emerald-50 text-emerald-600 rounded-full text-[10px] font-bold border border-emerald-100">
                      {p}
                    </span>
                  ))}
                </div>
              </div>

              {/* Instruments List */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-slate-500">
                  <Layers className="w-4 h-4" />
                  <span className="text-[10px] font-bold uppercase tracking-widest">搭载仪器清单</span>
                </div>
                <div className="space-y-3">
                  {stationInstruments.map(inst => (
                    <div key={inst.id} className="p-4 bg-white border border-slate-100 rounded-2xl shadow-sm hover:border-emerald-200 transition-all group">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <p className="text-xs font-bold text-slate-900">{inst.name_cn}</p>
                          <p className="text-[9px] text-slate-400 font-medium uppercase">{inst.name_en}</p>
                        </div>
                        <span className={cn(
                          "px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-tighter",
                          inst.status === 'normal' ? "bg-emerald-100 text-emerald-600" : "bg-rose-100 text-rose-600"
                        )}>
                          {inst.status === 'normal' ? '运行正常' : '维护中'}
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-y-2 text-[10px]">
                        <div className="flex gap-2"><span className="text-slate-400">编号:</span> <span className="text-slate-700 font-bold">{inst.code}</span></div>
                        <div className="flex gap-2"><span className="text-slate-400">原理:</span> <span className="text-slate-700 font-bold">{inst.principle}</span></div>
                        <div className="flex gap-2"><span className="text-slate-400">型号:</span> <span className="text-slate-700 font-bold">{inst.brand_model}</span></div>
                        <div className="flex gap-2"><span className="text-slate-400">安装:</span> <span className="text-slate-700 font-bold">{inst.install_year}年</span></div>
                        <div className="flex gap-2"><span className="text-slate-400">频率:</span> <span className="text-slate-700 font-bold">{inst.update_frequency}</span></div>
                        <div className="flex gap-2"><span className="text-slate-400">起始:</span> <span className="text-slate-700 font-bold">{inst.data_start_time}</span></div>
                      </div>
                      <div className="mt-3 pt-3 border-t border-slate-50">
                        <p className="text-[9px] text-slate-400 font-bold uppercase mb-1">监测参数</p>
                        <p className="text-[10px] text-slate-600 leading-relaxed">{inst.params}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Data Preview Chart */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-slate-500">
                  <History className="w-4 h-4" />
                  <span className="text-[10px] font-bold uppercase tracking-widest">实时趋势预览 (24h)</span>
                </div>
                <div className="h-48 w-full bg-slate-50 rounded-2xl p-4 border border-slate-100">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={stationData}>
                      <defs>
                        <linearGradient id="colorVal" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#059669" stopOpacity={0.2}/>
                          <stop offset="95%" stopColor="#059669" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                      <XAxis dataKey="timestamp" hide />
                      <YAxis stroke="#94a3b8" fontSize={10} axisLine={false} tickLine={false} />
                      <Tooltip 
                        contentStyle={{ backgroundColor: '#ffffff', border: 'none', borderRadius: '12px', fontSize: '10px', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}
                        itemStyle={{ color: '#059669', fontWeight: 'bold' }}
                      />
                      <Area type="monotone" dataKey="value" stroke="#059669" strokeWidth={2} fillOpacity={1} fill="url(#colorVal)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Action Button */}
              <div className="sticky bottom-0 pt-4 pb-2 bg-white/80 backdrop-blur-md">
                <button 
                  onClick={() => setIsPurchaseModalOpen(true)}
                  className="w-full py-4 bg-slate-900 hover:bg-slate-800 text-white rounded-2xl font-bold transition-all flex items-center justify-center gap-3 shadow-xl shadow-slate-900/20"
                >
                  <CreditCard className="w-5 h-5" />
                  购买站点观测数据
                </button>
                <p className="text-[10px] text-slate-400 mt-3 text-center font-medium">支持多选数据产品，购买后可在个人中心下载</p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Purchase Modal */}
      <AnimatePresence>
        {isPurchaseModalOpen && selectedStation && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsPurchaseModalOpen(false)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-lg bg-white rounded-[32px] shadow-2xl overflow-hidden"
            >
              <div className="p-8 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                <div>
                  <h4 className="text-xl font-black text-slate-900 tracking-tight">选择数据产品</h4>
                  <p className="text-xs text-slate-500 mt-1 font-medium">{selectedStation.name_cn} · 数据订购</p>
                </div>
                <button onClick={() => setIsPurchaseModalOpen(false)} className="p-2 hover:bg-white rounded-xl text-slate-400 transition-colors shadow-sm">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-8 space-y-4">
                {stationProducts.map(product => (
                  <div 
                    key={product.id}
                    onClick={() => {
                      setSelectedProductIds(prev => 
                        prev.includes(product.id) 
                          ? prev.filter(id => id !== product.id)
                          : [...prev, product.id]
                      )
                    }}
                    className={cn(
                      "p-5 rounded-2xl border-2 transition-all cursor-pointer flex items-center justify-between group",
                      selectedProductIds.includes(product.id)
                        ? "border-emerald-500 bg-emerald-50/50 shadow-md shadow-emerald-500/10"
                        : "border-slate-100 hover:border-slate-200 bg-white"
                    )}
                  >
                    <div className="flex items-center gap-4">
                      <div className={cn(
                        "w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all",
                        selectedProductIds.includes(product.id)
                          ? "bg-emerald-500 border-emerald-500"
                          : "border-slate-200 group-hover:border-slate-300"
                      )}>
                        {selectedProductIds.includes(product.id) && <Plus className="w-4 h-4 text-white rotate-45" />}
                      </div>
                      <div>
                        <p className="text-sm font-bold text-slate-900">{product.name}</p>
                        <p className="text-[10px] text-slate-500 font-medium mt-0.5">{product.time_range} · {product.type === 'hourly' ? '高频' : (product.type === 'daily' ? '统计' : '气候')}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-black text-slate-900">¥ {product.price.toFixed(2)}</p>
                    </div>
                  </div>
                ))}

                <div className="mt-8 pt-6 border-t border-slate-100 flex items-center justify-between">
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">合计金额</p>
                    <p className="text-3xl font-black text-emerald-600">
                      ¥ {stationProducts
                        .filter(p => selectedProductIds.includes(p.id))
                        .reduce((sum, p) => sum + p.price, 0)
                        .toFixed(2)}
                    </p>
                  </div>
                  <button 
                    disabled={selectedProductIds.length === 0 || isPurchasing}
                    onClick={() => handlePurchase(selectedStation)}
                    className="px-10 py-4 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-2xl font-bold transition-all shadow-xl shadow-emerald-600/20 flex items-center gap-2"
                  >
                    {isPurchasing ? '处理中...' : '确认付款并下载'}
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
    );
  };

  const renderPersonalCenter = () => (
    <div className="max-w-5xl mx-auto space-y-8">
      <div className="flex items-center gap-6 p-8 bg-white border border-slate-200 rounded-3xl shadow-sm">
        <div className="w-20 h-20 rounded-full bg-emerald-500/10 flex items-center justify-center border-2 border-emerald-500/20">
          <UserIcon className="w-10 h-10 text-emerald-600" />
        </div>
        <div className="flex-1">
          <h2 className="text-2xl font-bold text-slate-900">{user?.username || '未知用户'}</h2>
          <p className="text-slate-500 font-medium">{user?.organization || '未知机构'} · {user?.role === 'paid' ? '付费会员' : (user?.role === 'admin' ? '总管理员' : (user?.role === 'partner' ? '合作用户' : '普通用户'))}</p>
          <div className="flex gap-4 mt-4">
            <button className="text-xs px-4 py-2 bg-slate-100 hover:bg-slate-200 rounded-full text-slate-600 font-bold transition-colors">编辑资料</button>
            <button className="text-xs px-4 py-2 bg-slate-100 hover:bg-slate-200 rounded-full text-slate-600 font-bold transition-colors">修改密码</button>
          </div>
        </div>
        <div className="hidden md:block p-6 bg-slate-50 rounded-2xl border border-slate-100">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">开发测试工具</p>
          <div className="flex flex-wrap gap-2">
            {['admin', 'partner', 'paid', 'free'].map(role => (
              <button
                key={role}
                onClick={() => setUser(prev => prev ? { ...prev, role } : null)}
                className={cn(
                  "px-3 py-1 text-[10px] font-bold rounded-lg border transition-all",
                  user?.role === role 
                    ? "bg-emerald-600 border-emerald-600 text-white shadow-md shadow-emerald-600/20" 
                    : "bg-white border-slate-200 text-slate-500 hover:border-slate-300"
                )}
              >
                {role === 'admin' ? '管理员' : (role === 'partner' ? '合作者' : (role === 'paid' ? '付费' : '免费'))}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="md:col-span-2 space-y-6">
          <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <Download className="w-5 h-5 text-emerald-600" />
            已购观测资料
          </h3>
          <div className="space-y-4">
            {purchasedData.length === 0 ? (
              <div className="p-12 text-center border border-dashed border-slate-200 rounded-3xl text-slate-400 bg-white">
                暂无购买记录
              </div>
            ) : (
              purchasedData.map(p => (
                <div key={p.id} className="p-6 bg-white border border-slate-200 rounded-2xl flex items-center justify-between group hover:border-emerald-500/30 transition-all shadow-sm">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-slate-50 rounded-xl text-emerald-600 border border-slate-100">
                      <Database className="w-6 h-6" />
                    </div>
                    <div>
                      <p className="font-bold text-slate-900">{p.station_name}</p>
                      <p className="text-xs text-slate-500 font-medium">{p.instrument_name} · {p.data_range}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">购买时间</p>
                      <p className="text-sm font-bold text-slate-700">{new Date(p.purchase_time).toLocaleDateString()}</p>
                    </div>
                    <button className="p-3 bg-emerald-50 text-emerald-600 rounded-xl hover:bg-emerald-600 hover:text-white transition-all border border-emerald-100">
                      <Download className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="space-y-6">
          <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <Settings className="w-5 h-5 text-blue-600" />
            账户概览
          </h3>
          <div className="p-6 bg-white border border-slate-200 rounded-3xl space-y-6 shadow-sm">
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">账户余额</p>
              <p className="text-3xl font-black text-slate-900">¥ 1,240.50</p>
            </div>
            <div className="space-y-3 pt-4 border-t border-slate-100">
              <div className="flex justify-between text-sm">
                <span className="text-slate-500 font-medium">已购站点</span>
                <span className="text-slate-900 font-bold">{purchasedData.length} 个</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-500 font-medium">下载流量</span>
                <span className="text-slate-900 font-bold">12.4 GB</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-500 font-medium">API 额度</span>
                <span className="text-slate-900 font-bold">500 / 1000</span>
              </div>
            </div>
            <button className="w-full py-3 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-sm font-bold transition-all shadow-lg shadow-slate-900/20">
              充值额度
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  const renderDashboard = () => (
    <div className="space-y-8">
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
        <StatCard 
          label="监测站点总数" 
          value={stats?.stations?.count || 0} 
          icon={MapPin} 
          trend="+12%" 
          color="bg-blue-600"
        />
        <StatCard 
          label="在线仪器数量" 
          value={stats?.instruments?.count || 0} 
          icon={Activity} 
          trend="+5%" 
          color="bg-emerald-600"
        />
        <StatCard 
          label="系统运行健康度" 
          value="98.2%" 
          icon={Bell} 
          trend="-0.5%" 
          color="bg-amber-500"
        />
        <StatCard 
          label="异常告警统计" 
          value={stats?.abnormal_instruments?.count || 0} 
          icon={AlertTriangle} 
          color="bg-rose-600"
        />
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        <div className="p-8 border bg-white border-slate-200 rounded-3xl lg:col-span-2 shadow-sm">
          <h4 className="mb-8 text-lg font-bold text-slate-900">数据流量趋势</h4>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={[
                { name: 'Mon', val: 400 },
                { name: 'Tue', val: 300 },
                { name: 'Wed', val: 600 },
                { name: 'Thu', val: 800 },
                { name: 'Fri', val: 500 },
                { name: 'Sat', val: 900 },
                { name: 'Sun', val: 700 },
              ]}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis dataKey="name" stroke="#94a3b8" fontSize={12} />
                <YAxis stroke="#94a3b8" fontSize={12} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                />
                <Area type="monotone" dataKey="val" stroke="#2563eb" strokeWidth={3} fill="#3b82f6" fillOpacity={0.05} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="p-8 border bg-white border-slate-200 rounded-3xl shadow-sm">
          <h4 className="mb-8 text-lg font-bold text-slate-900">网络分布占比</h4>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={[
                    { name: '空气质量', value: 40 },
                    { name: '温室气体', value: 30 },
                    { name: '水质监测', value: 20 },
                    { name: '噪声监测', value: 10 },
                  ]}
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  <Cell fill="#2563eb" />
                  <Cell fill="#059669" />
                  <Cell fill="#f59e0b" />
                  <Cell fill="#ef4444" />
                </Pie>
                <Tooltip 
                  contentStyle={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px' }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-4 space-y-2">
            {[
              { name: '空气质量', color: 'bg-blue-600', val: '40%' },
              { name: '温室气体', color: 'bg-emerald-600', val: '30%' },
              { name: '水质监测', color: 'bg-amber-500', val: '20%' },
              { name: '噪声监测', color: 'bg-rose-500', val: '10%' },
            ].map(item => (
              <div key={item.name} className="flex items-center justify-between text-xs font-bold">
                <div className="flex items-center gap-2">
                  <div className={cn("w-2 h-2 rounded-full", item.color)} />
                  <span className="text-slate-500">{item.name}</span>
                </div>
                <span className="text-slate-900">{item.val}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );

  const renderManagementCenter = () => {
    const mgmtItems = [
      { id: 'dashboard', label: '运行概览', icon: LayoutDashboard },
      { id: 'stations', label: '站点管理', icon: MapPin },
      { id: 'stats', label: '数据统计', icon: PieChartIcon, partnerOnly: true },
      { id: 'revenue', label: '收益管理', icon: Wallet, partnerOnly: true },
      { id: 'purchases', label: '购买记录', icon: Database },
      { id: 'account', label: '账户管理', icon: UserCog },
      { id: 'invoices', label: '发票管理', icon: FileText },
    ];

    const filteredItems = mgmtItems.filter(item => 
      !item.partnerOnly || (user?.role === 'admin' || user?.role === 'partner')
    );

    return (
      <div className="flex h-full bg-white overflow-hidden">
        {/* Management Sidebar */}
        <aside className="w-64 border-r border-slate-200 flex flex-col bg-slate-50/50">
          <div className="p-6 border-b border-slate-200">
            <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider">管理中心</h3>
            <p className="text-[10px] text-slate-400 font-bold mt-1">MANAGEMENT CENTER</p>
          </div>
          <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
            {filteredItems.map(item => (
              <button
                key={item.id}
                onClick={() => setMgmtTab(item.id)}
                className={cn(
                  "flex items-center w-full gap-3 px-4 py-3 text-sm font-bold transition-all rounded-xl group",
                  mgmtTab === item.id 
                    ? "bg-emerald-600 text-white shadow-lg shadow-emerald-600/20" 
                    : "text-slate-500 hover:bg-white hover:text-slate-900 border border-transparent hover:border-slate-200"
                )}
              >
                <item.icon className={cn("w-4 h-4", mgmtTab === item.id ? "text-white" : "text-slate-400 group-hover:text-slate-600")} />
                {item.label}
              </button>
            ))}
          </nav>
        </aside>

        {/* Management Content */}
        <main className="flex-1 overflow-y-auto p-8 custom-scrollbar bg-slate-50">
          <AnimatePresence mode="wait">
            <motion.div
              key={mgmtTab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              {mgmtTab === 'dashboard' && renderDashboard()}
              {mgmtTab === 'stations' && (
                <div className="flex flex-col items-center justify-center h-[70vh] text-center">
                  <div className="p-8 mb-6 rounded-full bg-white border border-slate-200 shadow-sm">
                    <MapPin className="w-16 h-16 text-slate-300" />
                  </div>
                  <h3 className="text-2xl font-bold text-slate-900">站点管理模块</h3>
                  <p className="max-w-md mt-4 text-slate-500 font-medium">
                    管理员可在此处对全球站点进行增删改查、数字孪生配置以及运行状态监控。
                  </p>
                  <button className="mt-8 px-8 py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold transition-all shadow-lg shadow-emerald-600/20">
                    添加新站点
                  </button>
                </div>
              )}
              {mgmtTab === 'stats' && (
                <div className="p-12 text-center border border-dashed border-slate-200 rounded-3xl text-slate-400 bg-white">
                  数据统计功能开发中...
                </div>
              )}
              {mgmtTab === 'revenue' && (
                <div className="p-12 text-center border border-dashed border-slate-200 rounded-3xl text-slate-400 bg-white">
                  收益管理功能开发中...
                </div>
              )}
              {mgmtTab === 'purchases' && (
                <div className="space-y-6">
                  <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                    <Database className="w-5 h-5 text-emerald-600" />
                    购买记录
                  </h3>
                  <div className="space-y-4">
                    {purchasedData.length === 0 ? (
                      <div className="p-12 text-center border border-dashed border-slate-200 rounded-3xl text-slate-400 bg-white">
                        暂无购买记录
                      </div>
                    ) : (
                      purchasedData.map(p => (
                        <div key={p.id} className="p-6 bg-white border border-slate-200 rounded-2xl flex items-center justify-between group hover:border-emerald-500/30 transition-all shadow-sm">
                          <div className="flex items-center gap-4">
                            <div className="p-3 bg-slate-50 rounded-xl text-emerald-600 border border-slate-100">
                              <Database className="w-6 h-6" />
                            </div>
                            <div>
                              <p className="font-bold text-slate-900">{p.station_name}</p>
                              <p className="text-xs text-slate-500 font-medium">{p.instrument_name} · {p.data_range}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-4">
                            <div className="text-right">
                              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">购买时间</p>
                              <p className="text-sm font-bold text-slate-700">{new Date(p.purchase_time).toLocaleDateString()}</p>
                            </div>
                            <button className="p-3 bg-emerald-50 text-emerald-600 rounded-xl hover:bg-emerald-600 hover:text-white transition-all border border-emerald-100">
                              <Download className="w-5 h-5" />
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
              {mgmtTab === 'account' && (
                <div className="p-12 text-center border border-dashed border-slate-200 rounded-3xl text-slate-400 bg-white">
                  账户管理功能开发中...
                </div>
              )}
              {mgmtTab === 'invoices' && (
                <div className="p-12 text-center border border-dashed border-slate-200 rounded-3xl text-slate-400 bg-white">
                  发票管理功能开发中...
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    );
  };

  return (
    <div className="flex flex-col min-h-screen bg-slate-50 text-slate-900 font-sans overflow-hidden">
      {/* Top Header */}
      <header className="flex items-center justify-between px-6 py-3 border-b bg-white/80 backdrop-blur-xl border-slate-200 sticky top-0 z-50 shadow-sm">
        <div className="flex items-center gap-8">
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => setActiveTab('map')}>
            <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-emerald-600 shadow-[0_0_15px_rgba(5,150,105,0.3)]">
              <Globe className="w-5 h-5 text-white" />
            </div>
            <div className="hidden sm:block">
              <h1 className="text-sm font-black tracking-tight text-slate-900 leading-tight">GVON</h1>
              <p className="text-[9px] text-slate-400 uppercase tracking-widest font-bold leading-tight">全球虚拟观测网络</p>
            </div>
          </div>
        </div>

        <div className="flex-1 max-w-xl mx-8 relative hidden md:flex items-center gap-3">
          <div className="relative">
            <button 
              onClick={() => setIsRegionMenuOpen(!isRegionMenuOpen)}
              className={cn(
                "flex items-center gap-2 px-4 py-2 bg-white border rounded-full text-[11px] font-bold transition-all shadow-sm",
                isRegionMenuOpen ? "border-emerald-500 text-emerald-600 ring-2 ring-emerald-500/10" : "border-slate-200 text-slate-600 hover:border-slate-300"
              )}
            >
              <MapPin className="w-3.5 h-3.5" />
              <span className="truncate max-w-[80px]">{getRegionName(selectedRegion[0])}</span>
              <ChevronDown className={cn("w-3 h-3 transition-transform", isRegionMenuOpen && "rotate-180")} />
            </button>

            <AnimatePresence>
              {isRegionMenuOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setIsRegionMenuOpen(false)} />
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 10 }}
                    className="absolute left-0 top-full mt-2 w-64 bg-white border border-slate-200 rounded-2xl shadow-2xl z-50 p-2 max-h-[400px] overflow-y-auto custom-scrollbar"
                  >
                    <div className="p-2 border-b border-slate-100 mb-2">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">地区层级导航</p>
                    </div>
                    {renderRegionTree(regions)}
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </div>

          <div className="relative flex-1">
            <Search className="absolute w-4 h-4 -translate-y-1/2 left-3 top-1/2 text-slate-400" />
            <input 
              type="text" 
              placeholder="搜索监测站点、网络或参数..." 
              className="w-full py-2 pl-10 pr-4 text-xs transition-all bg-white border rounded-full border-slate-200 text-slate-700 focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/20 shadow-sm"
            />
          </div>
        </div>

        <div className="flex items-center gap-4">
          <button className="relative p-2 transition-colors rounded-lg hover:bg-slate-100 text-slate-400">
            <Bell className="w-5 h-5" />
            <span className="absolute top-2 right-2 w-1.5 h-1.5 bg-rose-500 rounded-full border border-white" />
          </button>
          
          <div className="h-6 w-[1px] bg-slate-200 mx-1" />

          <div className="relative">
            <button 
              onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
              className={cn(
                "flex items-center gap-3 p-1 pr-3 rounded-full transition-all border",
                isUserMenuOpen ? "bg-emerald-50 border-emerald-200" : "bg-white border-slate-200 hover:border-slate-300"
              )}
            >
              <div className="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center text-[10px] font-bold text-emerald-600 border border-slate-200">
                {user.username?.[0]?.toUpperCase() || '?'}
              </div>
              <div className="hidden lg:block text-left">
                <p className="text-[11px] font-bold text-slate-900 leading-none">{user.username}</p>
                <p className="text-[9px] text-slate-400 font-bold leading-none mt-1 uppercase tracking-tighter">
                  {user.role === 'admin' ? '管理员' : (user.role === 'partner' ? '合作者' : (user.role === 'paid' ? '付费' : '免费'))}
                </p>
              </div>
              <ChevronDown className={cn("w-3 h-3 text-slate-400 transition-transform", isUserMenuOpen && "rotate-180")} />
            </button>

            <AnimatePresence>
              {isUserMenuOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setIsUserMenuOpen(false)} />
                  <motion.div
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    className="absolute right-0 mt-2 w-56 bg-white border border-slate-200 rounded-2xl shadow-2xl z-50 overflow-hidden"
                  >
                    <div className="p-4 border-b border-slate-100 bg-slate-50/50">
                      <p className="text-xs font-bold text-slate-900">{user.username}</p>
                      <p className="text-[10px] text-slate-500 mt-0.5">{user.organization}</p>
                    </div>
                    <div className="p-2">
                      <button 
                        onClick={() => { setActiveTab('profile'); setIsUserMenuOpen(false); }}
                        className="flex items-center w-full gap-3 px-3 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50 hover:text-emerald-600 rounded-lg transition-colors"
                      >
                        <UserIcon className="w-4 h-4" />
                        个人中心
                      </button>
                      <button 
                        onClick={() => { setActiveTab('management'); setIsUserMenuOpen(false); }}
                        className="flex items-center w-full gap-3 px-3 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50 hover:text-emerald-600 rounded-lg transition-colors"
                      >
                        <Settings className="w-4 h-4" />
                        管理中心
                      </button>
                    </div>
                    <div className="p-2 border-t border-slate-100">
                      <button 
                        onClick={() => setUser(null)}
                        className="flex items-center w-full gap-3 px-3 py-2 text-xs font-bold text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                      >
                        <LogOut className="w-4 h-4" />
                        退出登录
                      </button>
                    </div>
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 relative overflow-hidden bg-slate-50">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="h-full w-full"
          >
            {activeTab === 'map' && (
              <div className="h-full w-full">
                {renderMap()}
              </div>
            )}
            
            {activeTab === 'profile' && (
              <div className="h-full w-full overflow-y-auto p-8 custom-scrollbar">
                {renderPersonalCenter()}
              </div>
            )}

            {activeTab === 'management' && (
              <div className="h-full w-full">
                {renderManagementCenter()}
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Footer */}
      <footer className="py-2 px-6 bg-white border-t border-slate-200 flex items-center justify-center gap-4 z-50">
        <p className="text-[10px] text-slate-400 font-medium uppercase tracking-widest">© 2026 SCDI Desgin by 陶城</p>
        <div className="h-3 w-[1px] bg-slate-200" />
        <a 
          href="http://beian.miit.gov.cn/" 
          target="_blank" 
          rel="noopener noreferrer"
          className="text-[10px] text-slate-400 hover:text-emerald-600 font-medium transition-colors"
        >
          京ICP备2023011454号-3
        </a>
      </footer>
    </div>
  );
}
