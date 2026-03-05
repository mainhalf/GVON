import React, { useState, useEffect, useMemo } from 'react';
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
  Heart,
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
  Leaf,
  Phone,
  Lock,
  ShieldCheck,
  ShoppingCart,
  Calendar,
  Clock,
  Cpu,
  Server,
  Filter,
  ArrowUpDown,
  CheckCircle,
  QrCode,
  ArrowRight,
  Trash2,
  Receipt
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

const InfoItem = ({ label, value }: { label: string, value: string | number }) => (
  <div className="space-y-1">
    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{label}</p>
    <p className="text-sm font-bold text-slate-700">{value}</p>
  </div>
);

const EquipmentItem = ({ label, value }: { label: string, value: string | number }) => (
  <div className="space-y-1">
    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">{label}</p>
    <p className="text-xs font-bold text-slate-700 truncate">{value}</p>
  </div>
);

const StatusBadge = ({ label, status, color }: { label: string, status: string, color: 'emerald' | 'blue' | 'slate' | 'rose' }) => (
  <div className={cn(
    "p-3 rounded-2xl border flex flex-col gap-1",
    color === 'emerald' ? "bg-emerald-50 border-emerald-100" :
    color === 'blue' ? "bg-blue-50 border-blue-100" :
    color === 'rose' ? "bg-rose-50 border-rose-100" :
    "bg-slate-50 border-slate-100"
  )}>
    <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">{label}</p>
    <p className={cn(
      "text-[10px] font-black",
      color === 'emerald' ? "text-emerald-600" :
      color === 'blue' ? "text-blue-600" :
      color === 'rose' ? "text-rose-600" :
      "text-slate-600"
    )}>{status}</p>
  </div>
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
  const [user, setUser] = useState<User | null>({
    id: 1,
    username: 'AdminUser',
    role: 'admin',
    organization: 'SCDI 监测中心'
  });
  const [activeTab, setActiveTab] = useState('map');
  const [mgmtTab, setMgmtTab] = useState('overview');
  const [profileTab, setProfileTab] = useState('favorites');
  const [stationDetailTab, setStationDetailTab] = useState('info');
  const [favorites, setFavorites] = useState<number[]>([]);
  const [cart, setCart] = useState<any[]>([]);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isLegendExpanded, setIsLegendExpanded] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [stats, setStats] = useState<any>(null);
  const [stations, setStations] = useState<Station[]>([]);
  const [networks, setNetworks] = useState<Network[]>([]);
  const [selectedStation, setSelectedStation] = useState<Station | null>(null);
  const [activePopupStation, setActivePopupStation] = useState<Station | null>(null);
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
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchResultsOpen, setIsSearchResultsOpen] = useState(false);
  const [focusedStation, setFocusedStation] = useState<Station | null>(null);
  const [checkoutStep, setCheckoutStep] = useState<'cart' | 'checkout' | 'payment' | 'success'>('cart');
  const [notifications] = useState([
    { id: 1, title: '系统更新', content: 'GVON 平台已升级至 v2.5 版本，新增多维度地区筛选功能。', time: '10分钟前', type: 'info' },
    { id: 2, title: '数据购买成功', content: '您购买的“北京奥体中心站-逐小时高精度包”已准备就绪。', time: '2小时前', type: 'success' },
    { id: 3, title: '站点异常预警', content: '位于南极洲的 ANT-02 站点传感器连接不稳定，请关注。', time: '5小时前', type: 'warning' },
  ]);

  const filteredCount = useMemo(() => {
    return stations.filter(s => {
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
    }).length;
  }, [stations, selectedNetworkId, networks, selectedRegion]);

  const displayedStations = useMemo(() => {
    if (selectedStation) return [selectedStation];
    if (focusedStation) return [focusedStation];
    
    return stations.filter(s => {
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
  }, [stations, selectedNetworkId, networks, selectedRegion, selectedStation, focusedStation]);

  const zoomToStation = (station: Station) => {
    const width = 1000;
    const height = 500;
    const projection = d3.geoMercator()
      .scale(150)
      .translate([width / 2, height / 1.5]);
    
    const coords = projection([station.lng, station.lat]);
    if (coords) {
      const [x, y] = coords;
      const k = 12;
      setMapTransform({
        x: width / 2 - x * k,
        y: height / 2 - y * k,
        k: k
      });
    }
  };

  // Mock login
  useEffect(() => {
    const controller = new AbortController();
    const fetchData = async () => {
      try {
        // Fetch GeoJSON for world map with timeout
        const timeoutId = setTimeout(() => {
          try {
            controller.abort("timeout");
          } catch (e) {
            controller.abort();
          }
        }, 15000); // Increased to 15s
        
        const geoRes = await fetch('https://raw.githubusercontent.com/holtzy/D3-graph-gallery/master/DATA/world.geojson', { 
          signal: controller.signal 
        });
        clearTimeout(timeoutId);
        
        if (geoRes.ok) {
          const data = await geoRes.json();
          setGeoJsonData(data);
        } else {
          throw new Error(`Fetch failed with status: ${geoRes.status}`);
        }
      } catch (err: any) {
        if (err.name === 'AbortError' || controller.signal.aborted) {
          // Silently handle aborts (timeout or unmount)
          return;
        }
        
        console.error("Failed to fetch GeoJSON, using simple fallback:", err);
        
        // Minimal fallback GeoJSON (just a box for the world)
        if (!geoJsonData) {
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
          setUser({ ...data, role: 'admin' });
        } else {
          console.error("Login failed with status:", res.status);
        }
      } catch (e) {
        console.error("Login failed", e);
      }
    };
    login();

    return () => {
      try {
        controller.abort("unmount");
      } catch (e) {
        controller.abort();
      }
    };
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
      if (Math.abs(e.deltaY) < 0.1) return;
      
      const delta = e.deltaY > 0 ? 0.9 : 1.1;
      const newK = Math.min(Math.max(mapTransform.k * delta, 0.5), 20);
      
      // Zoom centered on the view center as requested to avoid "moving" the map
      const centerX = width / 2;
      const centerY = height / 2;
      
      const ratio = newK / mapTransform.k;
      const newX = centerX - (centerX - mapTransform.x) * ratio;
      const newY = centerY - (centerY - mapTransform.y) * ratio;

      setMapTransform({ x: newX, y: newY, k: newK });
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
                {displayedStations.map((s) => {
                  const coords = projection([s.lng, s.lat]);
                  if (!coords) return null;
                  const [x, y] = coords;
                  const isSelected = selectedStation?.id === s.id;
                  const isFocused = focusedStation?.id === s.id;
                  const isFavorited = favorites.includes(s.id);
                  
                  return (
                    <g 
                      key={s.id} 
                      className="cursor-pointer group"
                      onClick={(e) => {
                        e.stopPropagation();
                        setActivePopupStation(s);
                        setFocusedStation(null);
                        zoomToStation(s);
                      }}
                    >
                      {/* Glow Effect */}
                      <circle 
                        cx={x} cy={y} r={(isSelected || isFocused ? 12 : 6) / mapTransform.k} 
                        fill={isFavorited ? '#f43f5e' : '#10b981'} 
                        fillOpacity={0.3}
                        className="animate-pulse"
                      />
                      {/* Main Dot */}
                      <circle 
                        cx={x} cy={y} r={(isSelected || isFocused ? 6 : 4) / mapTransform.k} 
                        fill={isSelected || isFocused ? (isFavorited ? '#e11d48' : '#059669') : (isFavorited ? '#f43f5e' : '#10b981')} 
                        stroke="white"
                        strokeWidth={(isSelected || isFocused ? 2 : 1.5) / mapTransform.k}
                        className="transition-all duration-300 group-hover:r-6"
                      />
                      {/* Favorite Indicator (Small Dot) */}
                      {isFavorited && !isSelected && !isFocused && (
                        <circle 
                          cx={x + 3 / mapTransform.k} cy={y - 3 / mapTransform.k} 
                          r={2 / mapTransform.k} 
                          fill="#f43f5e" 
                          stroke="white"
                          strokeWidth={0.5 / mapTransform.k}
                        />
                      )}
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

          {/* Station Popup Overlay */}
          <AnimatePresence>
            {activePopupStation && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 10 }}
                className="absolute z-20 pointer-events-auto"
                style={{
                  left: projection([activePopupStation.lng, activePopupStation.lat])![0] * mapTransform.k + mapTransform.x,
                  top: projection([activePopupStation.lng, activePopupStation.lat])![1] * mapTransform.k + mapTransform.y - 120,
                  transform: 'translateX(-50%)'
                }}
              >
                <div className="bg-white border border-slate-200 rounded-2xl shadow-2xl p-4 w-64 relative">
                  {/* Arrow */}
                  <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-4 h-4 bg-white border-b border-r border-slate-200 rotate-45" />
                  
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h4 className="text-sm font-black text-slate-900 truncate max-w-[160px]">{activePopupStation.name_cn}</h4>
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">{activePopupStation.network_name_cn}</p>
                    </div>
                    <button 
                      onClick={() => setActivePopupStation(null)}
                      className="p-1 hover:bg-slate-100 rounded-lg text-slate-400"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-2 mb-4">
                    <div className="p-2 bg-emerald-50 rounded-xl border border-emerald-100">
                      <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">运行状态</p>
                      <p className="text-[10px] font-black text-emerald-600">正常运行</p>
                    </div>
                    <div className="p-2 bg-blue-50 rounded-xl border border-blue-100">
                      <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">监测情况</p>
                      <p className="text-[10px] font-black text-blue-600">实时传输</p>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <button 
                      onClick={() => {
                        setSelectedStation(activePopupStation);
                        setActiveTab('station-detail');
                        setActivePopupStation(null);
                        fetchStationData(activePopupStation.id);
                      }}
                      className="flex-1 py-2 bg-emerald-600 text-white rounded-xl text-[10px] font-black shadow-lg shadow-emerald-600/20 hover:bg-emerald-500 transition-all"
                    >
                      站点详情
                    </button>
                    <button 
                      onClick={() => {
                        setFavorites(prev => 
                          prev.includes(activePopupStation.id) 
                            ? prev.filter(id => id !== activePopupStation.id) 
                            : [...prev, activePopupStation.id]
                        );
                      }}
                      className={cn(
                        "p-2 rounded-xl border transition-all",
                        favorites.includes(activePopupStation.id)
                          ? "bg-rose-50 border-rose-100 text-rose-500"
                          : "bg-white border-slate-200 text-slate-400 hover:border-slate-300"
                      )}
                    >
                      <Heart className={cn("w-4 h-4", favorites.includes(activePopupStation.id) && "fill-current")} />
                    </button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

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
              onWheel={(e) => e.stopPropagation()}
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

  const renderCartPage = () => {
    const totalAmount = cart.reduce((sum, item) => sum + item.price, 0);

    return (
      <div className="h-full w-full bg-slate-50 overflow-y-auto custom-scrollbar p-8">
        <div className="max-w-4xl mx-auto">
          {/* Progress Header */}
          <div className="flex items-center justify-between mb-12 bg-white p-6 rounded-[32px] shadow-sm border border-slate-100">
            {[
              { id: 'cart', label: '我的购物车', icon: ShoppingCart },
              { id: 'checkout', label: '确认订单', icon: Receipt },
              { id: 'payment', label: '支付', icon: Wallet },
              { id: 'success', label: '完成', icon: CheckCircle },
            ].map((step, idx, arr) => (
              <React.Fragment key={step.id}>
                <div className="flex flex-col items-center gap-2 relative z-10">
                  <div className={cn(
                    "w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-500",
                    checkoutStep === step.id ? "bg-emerald-600 text-white shadow-xl shadow-emerald-600/20 scale-110" : 
                    arr.findIndex(s => s.id === checkoutStep) > idx ? "bg-emerald-100 text-emerald-600" : "bg-slate-100 text-slate-400"
                  )}>
                    <step.icon className="w-6 h-6" />
                  </div>
                  <span className={cn(
                    "text-[10px] font-black uppercase tracking-widest",
                    checkoutStep === step.id ? "text-emerald-600" : "text-slate-400"
                  )}>{step.label}</span>
                </div>
                {idx < arr.length - 1 && (
                  <div className="flex-1 h-[2px] mx-4 bg-slate-100 relative overflow-hidden">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: arr.findIndex(s => s.id === checkoutStep) > idx ? '100%' : '0%' }}
                      className="absolute inset-0 bg-emerald-600"
                    />
                  </div>
                )}
              </React.Fragment>
            ))}
          </div>

          <AnimatePresence mode="wait">
            {checkoutStep === 'cart' && (
              <motion.div
                key="cart"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="space-y-6"
              >
                <div className="bg-white rounded-[32px] shadow-sm border border-slate-100 overflow-hidden">
                  <div className="p-8 border-b border-slate-50 flex items-center justify-between">
                    <h3 className="text-xl font-black text-slate-900 tracking-tight">购物车清单</h3>
                    <span className="px-4 py-1 bg-slate-100 text-slate-500 rounded-full text-[10px] font-black uppercase tracking-widest">
                      共 {cart.length} 件商品
                    </span>
                  </div>
                  
                  {cart.length === 0 ? (
                    <div className="p-20 text-center">
                      <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6">
                        <ShoppingCart className="w-10 h-10 text-slate-200" />
                      </div>
                      <p className="text-slate-400 font-bold">您的购物车空空如也</p>
                      <button 
                        onClick={() => setActiveTab('map')}
                        className="mt-8 px-8 py-3 bg-emerald-600 text-white rounded-2xl font-black text-xs shadow-lg shadow-emerald-600/20"
                      >
                        去浏览数据
                      </button>
                    </div>
                  ) : (
                    <>
                      <div className="divide-y divide-slate-50">
                        {cart.map((item, idx) => (
                          <div key={idx} className="p-8 flex items-center gap-6 hover:bg-slate-50/50 transition-colors group">
                            <div className="w-16 h-16 bg-emerald-50 rounded-2xl flex items-center justify-center text-emerald-600 shrink-0">
                              <Database className="w-8 h-8" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <h4 className="text-lg font-black text-slate-900 truncate">{item.station_name}</h4>
                              <p className="text-xs text-slate-500 font-bold mt-1">{item.param_name} · {item.time_range}</p>
                              <div className="flex items-center gap-4 mt-3">
                                <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-100">
                                  高精度观测数据
                                </span>
                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                  版本: v2.0
                                </span>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="text-xl font-black text-slate-900">¥{item.price}</p>
                              <button 
                                onClick={() => setCart(prev => prev.filter((_, i) => i !== idx))}
                                className="mt-2 p-2 text-slate-300 hover:text-rose-500 transition-colors"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                      <div className="p-8 bg-slate-50/50 border-t border-slate-100 flex items-center justify-between">
                        <div>
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">应付总额</p>
                          <p className="text-3xl font-black text-slate-900 tracking-tighter">¥{totalAmount}</p>
                        </div>
                        <button 
                          onClick={() => setCheckoutStep('checkout')}
                          className="px-12 py-4 bg-slate-900 text-white rounded-[24px] font-black text-sm shadow-xl shadow-slate-900/20 flex items-center gap-3 hover:scale-105 transition-all"
                        >
                          确认下单
                          <ArrowRight className="w-5 h-5" />
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </motion.div>
            )}

            {checkoutStep === 'checkout' && (
              <motion.div
                key="checkout"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="grid grid-cols-1 lg:grid-cols-3 gap-8"
              >
                <div className="lg:col-span-2 space-y-6">
                  <div className="bg-white rounded-[32px] shadow-sm border border-slate-100 p-8">
                    <h3 className="text-xl font-black text-slate-900 tracking-tight mb-8">账单信息</h3>
                    <div className="grid grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">发票抬头</label>
                        <input type="text" defaultValue={user?.organization} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold focus:outline-none focus:border-emerald-500" />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">纳税人识别号</label>
                        <input type="text" placeholder="可选填" className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold focus:outline-none focus:border-emerald-500" />
                      </div>
                      <div className="col-span-2 space-y-2">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">电子邮箱 (接收数据下载链接)</label>
                        <input type="email" defaultValue={user?.email} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold focus:outline-none focus:border-emerald-500" />
                      </div>
                    </div>
                  </div>

                  <div className="bg-white rounded-[32px] shadow-sm border border-slate-100 p-8">
                    <h3 className="text-xl font-black text-slate-900 tracking-tight mb-8">支付方式</h3>
                    <div className="grid grid-cols-3 gap-4">
                      {[
                        { id: 'alipay', label: '支付宝', color: 'text-blue-500', icon: Wallet },
                        { id: 'wechat', label: '微信支付', color: 'text-emerald-500', icon: QrCode },
                        { id: 'card', label: '银行卡', color: 'text-slate-900', icon: CreditCard },
                      ].map(method => (
                        <button 
                          key={method.id}
                          className="p-6 border-2 border-slate-100 rounded-[24px] hover:border-emerald-500 transition-all flex flex-col items-center gap-3 group"
                        >
                          <method.icon className={cn("w-8 h-8", method.color)} />
                          <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 group-hover:text-emerald-600">{method.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="space-y-6">
                  <div className="bg-white rounded-[32px] shadow-sm border border-slate-100 p-8 sticky top-24">
                    <h3 className="text-lg font-black text-slate-900 tracking-tight mb-6">订单摘要</h3>
                    <div className="space-y-4 mb-8">
                      <div className="flex justify-between text-xs font-bold">
                        <span className="text-slate-400">商品总计</span>
                        <span className="text-slate-900">¥{totalAmount}</span>
                      </div>
                      <div className="flex justify-between text-xs font-bold">
                        <span className="text-slate-400">优惠减免</span>
                        <span className="text-emerald-600">-¥0</span>
                      </div>
                      <div className="flex justify-between text-xs font-bold">
                        <span className="text-slate-400">增值税 (0%)</span>
                        <span className="text-slate-900">¥0</span>
                      </div>
                      <div className="pt-4 border-t border-slate-100 flex justify-between items-end">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">实付金额</span>
                        <span className="text-2xl font-black text-slate-900">¥{totalAmount}</span>
                      </div>
                    </div>
                    <button 
                      onClick={() => setCheckoutStep('payment')}
                      className="w-full py-4 bg-emerald-600 text-white rounded-[24px] font-black text-sm shadow-xl shadow-emerald-600/20 hover:scale-105 transition-all"
                    >
                      立即支付
                    </button>
                    <button 
                      onClick={() => setCheckoutStep('cart')}
                      className="w-full mt-4 py-2 text-[10px] font-black text-slate-400 uppercase tracking-widest hover:text-slate-600 transition-colors"
                    >
                      返回修改购物车
                    </button>
                  </div>
                </div>
              </motion.div>
            )}

            {checkoutStep === 'payment' && (
              <motion.div
                key="payment"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="max-w-md mx-auto bg-white rounded-[40px] shadow-2xl border border-slate-100 overflow-hidden"
              >
                <div className="p-10 text-center">
                  <div className="flex items-center justify-center gap-2 mb-8">
                    <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center">
                      <Wallet className="w-5 h-5 text-white" />
                    </div>
                    <span className="text-lg font-black text-slate-900 tracking-tight">支付宝支付</span>
                  </div>
                  
                  <div className="aspect-square bg-slate-50 rounded-[32px] p-8 mb-8 relative group">
                    <div className="w-full h-full border-2 border-dashed border-slate-200 rounded-2xl flex flex-col items-center justify-center gap-4">
                      <QrCode className="w-32 h-32 text-slate-200 group-hover:text-blue-500 transition-colors" />
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">请使用支付宝扫码支付</p>
                    </div>
                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <button 
                        onClick={() => {
                          setPurchasedData(prev => [
                            ...prev,
                            ...cart.map(item => ({
                              id: Math.random().toString(36).substr(2, 9),
                              station_name: item.station_name,
                              param_name: item.param_name,
                              purchase_date: new Date().toISOString().split('T')[0],
                              expiry_date: '2027-03-04',
                              status: 'ready'
                            }))
                          ]);
                          setCart([]);
                          setCheckoutStep('success');
                        }}
                        className="px-8 py-3 bg-blue-500 text-white rounded-2xl font-black text-xs shadow-xl shadow-blue-500/20"
                      >
                        模拟支付成功
                      </button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <p className="text-3xl font-black text-slate-900">¥{totalAmount}</p>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">订单号: GVON-{Math.random().toString(36).substr(2, 9).toUpperCase()}</p>
                  </div>
                </div>
                <div className="p-6 bg-slate-50 border-t border-slate-100 text-center">
                  <button 
                    onClick={() => setCheckoutStep('checkout')}
                    className="text-[10px] font-black text-slate-400 uppercase tracking-widest hover:text-slate-600"
                  >
                    取消支付并返回
                  </button>
                </div>
              </motion.div>
            )}

            {checkoutStep === 'success' && (
              <motion.div
                key="success"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="max-w-2xl mx-auto text-center"
              >
                <div className="w-24 h-24 bg-emerald-100 text-emerald-600 rounded-[32px] flex items-center justify-center mx-auto mb-8 shadow-xl shadow-emerald-600/10">
                  <CheckCircle className="w-12 h-12" />
                </div>
                <h2 className="text-4xl font-black text-slate-900 tracking-tighter mb-4">订单支付成功！</h2>
                <p className="text-slate-500 font-bold mb-12">您的数据产品已准备就绪，下载链接已发送至您的邮箱。</p>
                
                <div className="grid grid-cols-2 gap-4">
                  <button 
                    onClick={() => setActiveTab('profile')}
                    className="p-6 bg-white border border-slate-200 rounded-[32px] hover:border-emerald-500 transition-all group"
                  >
                    <Database className="w-8 h-8 text-emerald-600 mb-3 mx-auto" />
                    <p className="text-sm font-black text-slate-900">查看我的数据</p>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">View My Data</p>
                  </button>
                  <button 
                    onClick={() => setActiveTab('map')}
                    className="p-6 bg-white border border-slate-200 rounded-[32px] hover:border-emerald-500 transition-all group"
                  >
                    <Globe className="w-8 h-8 text-blue-600 mb-3 mx-auto" />
                    <p className="text-sm font-black text-slate-900">返回地图浏览</p>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Back to Map</p>
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    );
  };

  const renderPersonalCenter = () => {
    const profileItems = [
      { id: 'favorites', label: '我的收藏', icon: Heart },
      { id: 'orders', label: '订单管理', icon: Database },
      { id: 'invoices', label: '我的发票', icon: FileText },
      { id: 'messages', label: '消息中心', icon: Bell },
      { id: 'profile', label: '个人资料', icon: UserIcon },
    ];

    return (
      <div className="flex h-full bg-white overflow-hidden shadow-sm">
        {/* Profile Sidebar */}
        <aside className="w-64 border-r border-slate-200 flex flex-col bg-slate-50/50">
          <div className="p-6 border-b border-slate-200">
            <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider">个人中心</h3>
            <p className="text-[10px] text-slate-400 font-bold mt-1">USER CENTER</p>
          </div>
          <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
            {profileItems.map(item => (
              <button
                key={item.id}
                onClick={() => setProfileTab(item.id)}
                className={cn(
                  "flex items-center w-full gap-3 px-4 py-3 text-sm font-bold transition-all rounded-xl group",
                  profileTab === item.id 
                    ? "bg-emerald-600 text-white shadow-lg shadow-emerald-600/20" 
                    : "text-slate-500 hover:bg-white hover:text-slate-900 border border-transparent hover:border-slate-200"
                )}
              >
                <item.icon className={cn("w-4 h-4", profileTab === item.id ? "text-white" : "text-slate-400 group-hover:text-slate-600")} />
                {item.label}
              </button>
            ))}
          </nav>
          <div className="p-4 border-t border-slate-200">
            <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-sm">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">开发测试工具</p>
              <div className="flex flex-wrap gap-2">
                {['admin', 'partner', 'paid', 'free'].map(role => (
                  <button
                    key={role}
                    onClick={() => setUser(prev => prev ? { ...prev, role } : null)}
                    className={cn(
                      "px-2 py-1 text-[9px] font-bold rounded-lg border transition-all",
                      user?.role === role 
                        ? "bg-emerald-600 border-emerald-600 text-white" 
                        : "bg-white border-slate-200 text-slate-500 hover:border-slate-300"
                    )}
                  >
                    {role === 'admin' ? '管' : (role === 'partner' ? '合' : (role === 'paid' ? '付' : '免'))}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </aside>

        {/* Profile Content */}
        <main className="flex-1 overflow-y-auto p-8 custom-scrollbar bg-slate-50">
          <AnimatePresence mode="wait">
            <motion.div
              key={profileTab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              {profileTab === 'favorites' && (
                <div className="space-y-6">
                  <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                    <Heart className="w-5 h-5 text-rose-500" />
                    我的收藏
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {favorites.length === 0 ? (
                      <div className="col-span-full p-12 text-center border border-dashed border-slate-200 rounded-3xl text-slate-400 bg-white">
                        暂无收藏站点
                      </div>
                    ) : (
                      stations.filter(s => favorites.includes(s.id)).map(s => (
                        <div 
                          key={s.id} 
                          onClick={() => {
                            setSelectedStation(s);
                            setActiveTab('station-detail');
                            fetchStationData(s.id);
                          }}
                          className="p-4 bg-white border border-slate-200 rounded-2xl flex items-center justify-between group hover:border-emerald-500/30 transition-all shadow-sm cursor-pointer"
                        >
                          <div className="flex items-center gap-3">
                            <div className="p-2 bg-rose-50 rounded-xl text-rose-500 border border-rose-100 group-hover:bg-emerald-50 group-hover:text-emerald-600 group-hover:border-emerald-100 transition-colors">
                              <MapPin className="w-5 h-5" />
                            </div>
                            <div>
                              <p className="font-bold text-slate-900 text-sm group-hover:text-emerald-600 transition-colors">{s.name_cn}</p>
                              <p className="text-[10px] text-slate-500 font-medium">{s.network_name_cn}</p>
                            </div>
                          </div>
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              setFavorites(prev => prev.filter(id => id !== s.id));
                            }}
                            className="p-2 text-rose-500 hover:bg-rose-50 rounded-lg transition-colors"
                          >
                            <Heart className="w-4 h-4 fill-current" />
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
              {profileTab === 'orders' && (
                <div className="space-y-6">
                  <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                    <Database className="w-5 h-5 text-emerald-600" />
                    订单管理
                  </h3>
                  <div className="space-y-4">
                    {purchasedData.length === 0 ? (
                      <div className="p-12 text-center border border-dashed border-slate-200 rounded-3xl text-slate-400 bg-white">
                        暂无订单记录
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
              {profileTab === 'invoices' && (
                <div className="space-y-6">
                  <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                    <FileText className="w-5 h-5 text-blue-600" />
                    我的发票
                  </h3>
                  <div className="p-8 bg-white border border-slate-200 rounded-3xl shadow-sm">
                    <div className="flex items-center justify-between mb-6">
                      <p className="text-sm font-bold text-slate-700">可开票订单</p>
                      <button className="px-4 py-2 bg-emerald-600 text-white rounded-xl text-xs font-bold shadow-lg shadow-emerald-600/20">批量开票</button>
                    </div>
                    <div className="space-y-3">
                      {purchasedData.map(p => (
                        <div key={p.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
                          <div className="flex items-center gap-3">
                            <input type="checkbox" className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500" />
                            <div>
                              <p className="text-xs font-bold text-slate-900">{p.station_name} 数据订购</p>
                              <p className="text-[10px] text-slate-500">{new Date(p.purchase_time).toLocaleDateString()}</p>
                            </div>
                          </div>
                          <p className="text-xs font-black text-slate-900">¥ 199.00</p>
                        </div>
                      ))}
                    </div>
                    <div className="mt-8 pt-8 border-t border-slate-100 space-y-4">
                      <p className="text-sm font-bold text-slate-900">发票抬头信息</p>
                      <div className="grid grid-cols-2 gap-4">
                        <input type="text" placeholder="发票抬头" className="p-3 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-emerald-500" />
                        <input type="text" placeholder="纳税人识别号" className="p-3 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-emerald-500" />
                      </div>
                      <button className="w-full py-3 bg-slate-900 text-white rounded-xl text-sm font-bold">提交开票申请</button>
                    </div>
                  </div>
                </div>
              )}
              {profileTab === 'messages' && (
                <div className="space-y-6">
                  <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                    <Bell className="w-5 h-5 text-amber-500" />
                    消息中心
                  </h3>
                  <div className="space-y-4">
                    {notifications.map(n => (
                      <div key={n.id} className="p-6 bg-white border border-slate-200 rounded-2xl flex items-start gap-4 group hover:border-emerald-500/30 transition-all shadow-sm">
                        <div className={cn(
                          "p-3 rounded-xl border",
                          n.type === 'success' ? "bg-emerald-50 border-emerald-100 text-emerald-600" :
                          n.type === 'warning' ? "bg-amber-50 border-amber-100 text-amber-600" :
                          "bg-blue-50 border-blue-100 text-blue-600"
                        )}>
                          {n.type === 'warning' ? <AlertTriangle className="w-6 h-6" /> : <Bell className="w-6 h-6" />}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center justify-between">
                            <p className="font-bold text-slate-900">{n.title}</p>
                            <span className="text-[10px] font-bold text-slate-400 uppercase">{n.time}</span>
                          </div>
                          <p className="text-xs text-slate-500 mt-1 font-medium leading-relaxed">{n.content}</p>
                          <div className="mt-4 flex gap-2">
                            <button className="text-[10px] font-bold text-emerald-600 hover:underline">查看详情</button>
                            <button className="text-[10px] font-bold text-slate-400 hover:text-slate-600">标记已读</button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {profileTab === 'profile' && (
                <div className="space-y-6">
                  <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                    <UserIcon className="w-5 h-5 text-emerald-600" />
                    个人资料
                  </h3>
                  <div className="p-8 bg-white border border-slate-200 rounded-3xl shadow-sm space-y-8">
                    <div className="flex items-center gap-6">
                      <div className="w-20 h-20 rounded-full bg-emerald-50 border-2 border-emerald-100 flex items-center justify-center">
                        <UserIcon className="w-10 h-10 text-emerald-600" />
                      </div>
                      <button className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-xs font-bold transition-colors">更换头像</button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">用户名</label>
                        <div className="flex items-center gap-3 p-3 bg-slate-50 border border-slate-200 rounded-xl">
                          <UserIcon className="w-4 h-4 text-slate-400" />
                          <input type="text" defaultValue={user?.username} className="bg-transparent text-xs font-bold text-slate-700 focus:outline-none w-full" />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">手机号</label>
                        <div className="flex items-center gap-3 p-3 bg-slate-50 border border-slate-200 rounded-xl">
                          <Phone className="w-4 h-4 text-slate-400" />
                          <input type="text" placeholder="未绑定手机号" className="bg-transparent text-xs font-bold text-slate-700 focus:outline-none w-full" />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">登录密码</label>
                        <div className="flex items-center gap-3 p-3 bg-slate-50 border border-slate-200 rounded-xl">
                          <Lock className="w-4 h-4 text-slate-400" />
                          <input type="password" value="********" readOnly className="bg-transparent text-xs font-bold text-slate-700 focus:outline-none w-full" />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">账号安全</label>
                        <div className="flex items-center gap-3 p-3 bg-emerald-50 border border-emerald-100 rounded-xl">
                          <ShieldCheck className="w-4 h-4 text-emerald-600" />
                          <span className="text-xs font-bold text-emerald-700">安全等级：高</span>
                        </div>
                      </div>
                    </div>
                    <button className="px-8 py-3 bg-emerald-600 text-white rounded-xl text-sm font-bold shadow-lg shadow-emerald-600/20">保存修改</button>
                  </div>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    );
  };

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
      { id: 'overview', label: '运行概览', icon: LayoutDashboard },
      { id: 'stations', label: '站点管理', icon: MapPin },
      { id: 'revenue', label: '收益管理', icon: Wallet },
      { id: 'account', label: '账户管理', icon: UserCog },
      { id: 'favorites', label: '我的收藏', icon: Heart },
      { id: 'orders', label: '订单管理', icon: Database },
      { id: 'invoices', label: '我的发票', icon: FileText },
      { id: 'messages', label: '消息中心', icon: Bell },
      { id: 'profile', label: '个人资料', icon: UserIcon },
    ];

    return (
      <div className="flex h-full bg-white overflow-hidden shadow-sm">
        {/* Management Sidebar */}
        <aside className="w-64 border-r border-slate-200 flex flex-col bg-slate-50/50">
          <div className="p-6 border-b border-slate-200">
            <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider">管理中心</h3>
            <p className="text-[10px] text-slate-400 font-bold mt-1">MANAGEMENT CENTER</p>
          </div>
          <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
            {mgmtItems.map(item => (
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
              {mgmtTab === 'overview' && renderDashboard()}
              {mgmtTab === 'stations' && (
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                      <MapPin className="w-5 h-5 text-emerald-600" />
                      站点管理
                    </h3>
                    <button className="px-6 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold text-xs transition-all shadow-lg shadow-emerald-600/20 flex items-center gap-2">
                      <Plus className="w-4 h-4" />
                      添加新站点
                    </button>
                  </div>
                  <div className="grid grid-cols-1 gap-4">
                    {stations.slice(0, 5).map(s => (
                      <div key={s.id} className="p-6 bg-white border border-slate-200 rounded-2xl flex items-center justify-between group hover:border-emerald-500/30 transition-all shadow-sm">
                        <div className="flex items-center gap-4">
                          <div className="p-3 bg-slate-50 rounded-xl text-emerald-600 border border-slate-100">
                            <MapPin className="w-6 h-6" />
                          </div>
                          <div>
                            <p className="font-bold text-slate-900">{s.name_cn}</p>
                            <p className="text-xs text-slate-500 font-medium">{s.network_name_cn} · {s.country}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="px-3 py-1 bg-emerald-50 text-emerald-600 text-[10px] font-bold rounded-full border border-emerald-100">运行中</span>
                          <button className="p-2 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-all">
                            <Settings className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {mgmtTab === 'revenue' && (
                <div className="space-y-6">
                  <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                    <Wallet className="w-5 h-5 text-amber-500" />
                    收益管理
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                    <div className="p-6 bg-white border border-slate-200 rounded-3xl shadow-sm">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">累计收益</p>
                      <p className="text-3xl font-black text-slate-900">¥ 45,280.00</p>
                    </div>
                    <div className="p-6 bg-white border border-slate-200 rounded-3xl shadow-sm">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">本月预计</p>
                      <p className="text-3xl font-black text-emerald-600">¥ 3,120.50</p>
                    </div>
                    <div className="p-6 bg-white border border-slate-200 rounded-3xl shadow-sm">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">待提现</p>
                      <p className="text-3xl font-black text-amber-500">¥ 1,240.00</p>
                    </div>
                  </div>
                  <div className="p-8 bg-white border border-slate-200 rounded-3xl shadow-sm">
                    <p className="text-sm font-bold text-slate-900 mb-6">最近收益记录</p>
                    <div className="space-y-4">
                      {[1, 2, 3].map(i => (
                        <div key={i} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
                          <div className="flex items-center gap-3">
                            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg">
                              <Database className="w-4 h-4" />
                            </div>
                            <div>
                              <p className="text-xs font-bold text-slate-900">站点数据购买收益</p>
                              <p className="text-[10px] text-slate-500">2024-03-0{i} 14:20</p>
                            </div>
                          </div>
                          <p className="text-xs font-black text-emerald-600">+ ¥ 59.40</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
              {mgmtTab === 'account' && (
                <div className="space-y-6">
                  <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                    <UserCog className="w-5 h-5 text-blue-600" />
                    账户管理
                  </h3>
                  <div className="p-8 bg-white border border-slate-200 rounded-3xl shadow-sm space-y-8">
                    <div className="space-y-4">
                      <p className="text-sm font-bold text-slate-900">收款账户设置</p>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <button className="p-6 border-2 border-emerald-500 bg-emerald-50 rounded-2xl text-left transition-all">
                          <div className="flex items-center justify-between mb-4">
                            <div className="w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center text-white font-bold">支</div>
                            <div className="w-4 h-4 rounded-full bg-emerald-500 flex items-center justify-center">
                              <div className="w-1.5 h-1.5 bg-white rounded-full" />
                            </div>
                          </div>
                          <p className="text-xs font-bold text-slate-900">支付宝</p>
                          <p className="text-[10px] text-slate-500 mt-1">138****8888</p>
                        </button>
                        <button className="p-6 border border-slate-200 hover:border-slate-300 rounded-2xl text-left transition-all">
                          <div className="flex items-center justify-between mb-4">
                            <div className="w-10 h-10 bg-slate-900 rounded-lg flex items-center justify-center text-white font-bold">银</div>
                          </div>
                          <p className="text-xs font-bold text-slate-900">银行卡</p>
                          <p className="text-[10px] text-slate-500 mt-1">未绑定</p>
                        </button>
                        <button className="p-6 border border-slate-200 hover:border-slate-300 rounded-2xl text-left transition-all">
                          <div className="flex items-center justify-between mb-4">
                            <div className="w-10 h-10 bg-slate-100 rounded-lg flex items-center justify-center text-slate-400 font-bold">公</div>
                          </div>
                          <p className="text-xs font-bold text-slate-900">对公账户</p>
                          <p className="text-[10px] text-slate-500 mt-1">未绑定</p>
                        </button>
                      </div>
                    </div>
                    <div className="pt-8 border-t border-slate-100">
                      <button className="px-8 py-3 bg-slate-900 text-white rounded-xl text-sm font-bold">保存账户设置</button>
                    </div>
                  </div>
                </div>
              )}
              {mgmtTab === 'favorites' && (
                <div className="space-y-6">
                  <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                    <Heart className="w-5 h-5 text-rose-500" />
                    我的收藏
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {favorites.length === 0 ? (
                      <div className="col-span-full p-12 text-center border border-dashed border-slate-200 rounded-3xl text-slate-400 bg-white">
                        暂无收藏站点
                      </div>
                    ) : (
                      stations.filter(s => favorites.includes(s.id)).map(s => (
                        <div 
                          key={s.id} 
                          onClick={() => {
                            setSelectedStation(s);
                            setActiveTab('station-detail');
                            fetchStationData(s.id);
                          }}
                          className="p-4 bg-white border border-slate-200 rounded-2xl flex items-center justify-between group hover:border-emerald-500/30 transition-all shadow-sm cursor-pointer"
                        >
                          <div className="flex items-center gap-3">
                            <div className="p-2 bg-rose-50 rounded-xl text-rose-500 border border-rose-100 group-hover:bg-emerald-50 group-hover:text-emerald-600 group-hover:border-emerald-100 transition-colors">
                              <MapPin className="w-5 h-5" />
                            </div>
                            <div>
                              <p className="font-bold text-slate-900 text-sm group-hover:text-emerald-600 transition-colors">{s.name_cn}</p>
                              <p className="text-[10px] text-slate-500 font-medium">{s.network_name_cn}</p>
                            </div>
                          </div>
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              setFavorites(prev => prev.filter(id => id !== s.id));
                            }}
                            className="p-2 text-rose-500 hover:bg-rose-50 rounded-lg transition-colors"
                          >
                            <Heart className="w-4 h-4 fill-current" />
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
              {mgmtTab === 'orders' && (
                <div className="space-y-6">
                  <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                    <Database className="w-5 h-5 text-emerald-600" />
                    订单管理
                  </h3>
                  <div className="space-y-4">
                    {purchasedData.length === 0 ? (
                      <div className="p-12 text-center border border-dashed border-slate-200 rounded-3xl text-slate-400 bg-white">
                        暂无订单记录
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
              {mgmtTab === 'invoices' && (
                <div className="space-y-6">
                  <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                    <FileText className="w-5 h-5 text-blue-600" />
                    我的发票
                  </h3>
                  <div className="p-8 bg-white border border-slate-200 rounded-3xl shadow-sm">
                    <div className="flex items-center justify-between mb-6">
                      <p className="text-sm font-bold text-slate-700">可开票订单</p>
                      <button className="px-4 py-2 bg-emerald-600 text-white rounded-xl text-xs font-bold shadow-lg shadow-emerald-600/20">批量开票</button>
                    </div>
                    <div className="space-y-3">
                      {purchasedData.map(p => (
                        <div key={p.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
                          <div className="flex items-center gap-3">
                            <input type="checkbox" className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500" />
                            <div>
                              <p className="text-xs font-bold text-slate-900">{p.station_name} 数据订购</p>
                              <p className="text-[10px] text-slate-500">{new Date(p.purchase_time).toLocaleDateString()}</p>
                            </div>
                          </div>
                          <p className="text-xs font-black text-slate-900">¥ 199.00</p>
                        </div>
                      ))}
                    </div>
                    <div className="mt-8 pt-8 border-t border-slate-100 space-y-4">
                      <p className="text-sm font-bold text-slate-900">发票抬头信息</p>
                      <div className="grid grid-cols-2 gap-4">
                        <input type="text" placeholder="发票抬头" className="p-3 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-emerald-500" />
                        <input type="text" placeholder="纳税人识别号" className="p-3 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-emerald-500" />
                      </div>
                      <button className="w-full py-3 bg-slate-900 text-white rounded-xl text-sm font-bold">提交开票申请</button>
                    </div>
                  </div>
                </div>
              )}
              {mgmtTab === 'messages' && (
                <div className="space-y-6">
                  <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                    <Bell className="w-5 h-5 text-amber-500" />
                    消息中心
                  </h3>
                  <div className="space-y-4">
                    {notifications.map(n => (
                      <div key={n.id} className="p-6 bg-white border border-slate-200 rounded-2xl flex items-start gap-4 group hover:border-emerald-500/30 transition-all shadow-sm">
                        <div className={cn(
                          "p-3 rounded-xl border",
                          n.type === 'success' ? "bg-emerald-50 border-emerald-100 text-emerald-600" :
                          n.type === 'warning' ? "bg-amber-50 border-amber-100 text-amber-600" :
                          "bg-blue-50 border-blue-100 text-blue-600"
                        )}>
                          {n.type === 'warning' ? <AlertTriangle className="w-6 h-6" /> : <Bell className="w-6 h-6" />}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center justify-between">
                            <p className="font-bold text-slate-900">{n.title}</p>
                            <span className="text-[10px] font-bold text-slate-400 uppercase">{n.time}</span>
                          </div>
                          <p className="text-xs text-slate-500 mt-1 font-medium leading-relaxed">{n.content}</p>
                          <div className="mt-4 flex gap-2">
                            <button className="text-[10px] font-bold text-emerald-600 hover:underline">查看详情</button>
                            <button className="text-[10px] font-bold text-slate-400 hover:text-slate-600">标记已读</button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {mgmtTab === 'profile' && (
                <div className="space-y-6">
                  <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                    <UserIcon className="w-5 h-5 text-emerald-600" />
                    个人资料
                  </h3>
                  <div className="p-8 bg-white border border-slate-200 rounded-3xl shadow-sm space-y-8">
                    <div className="flex items-center gap-6">
                      <div className="w-20 h-20 rounded-full bg-emerald-50 border-2 border-emerald-100 flex items-center justify-center">
                        <UserIcon className="w-10 h-10 text-emerald-600" />
                      </div>
                      <button className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-xs font-bold transition-colors">更换头像</button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">用户名</label>
                        <div className="flex items-center gap-3 p-3 bg-slate-50 border border-slate-200 rounded-xl">
                          <UserIcon className="w-4 h-4 text-slate-400" />
                          <input type="text" defaultValue={user?.username} className="bg-transparent text-xs font-bold text-slate-700 focus:outline-none w-full" />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">手机号</label>
                        <div className="flex items-center gap-3 p-3 bg-slate-50 border border-slate-200 rounded-xl">
                          <Phone className="w-4 h-4 text-slate-400" />
                          <input type="text" placeholder="未绑定手机号" className="bg-transparent text-xs font-bold text-slate-700 focus:outline-none w-full" />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">登录密码</label>
                        <div className="flex items-center gap-3 p-3 bg-slate-50 border border-slate-200 rounded-xl">
                          <Lock className="w-4 h-4 text-slate-400" />
                          <input type="password" value="********" readOnly className="bg-transparent text-xs font-bold text-slate-700 focus:outline-none w-full" />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">账号安全</label>
                        <div className="flex items-center gap-3 p-3 bg-emerald-50 border border-emerald-100 rounded-xl">
                          <ShieldCheck className="w-4 h-4 text-emerald-600" />
                          <span className="text-xs font-bold text-emerald-700">安全等级：高</span>
                        </div>
                      </div>
                    </div>
                    <button className="px-8 py-3 bg-emerald-600 text-white rounded-xl text-sm font-bold shadow-lg shadow-emerald-600/20">保存修改</button>
                  </div>
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
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setIsSearchResultsOpen(true);
              }}
              onFocus={() => setIsSearchResultsOpen(true)}
              placeholder="搜索监测站点、网络或参数..." 
              className="w-full py-2 pl-10 pr-4 text-xs transition-all bg-white border rounded-full border-slate-200 text-slate-700 focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/20 shadow-sm"
            />

            <AnimatePresence>
              {isSearchResultsOpen && searchQuery.trim() !== '' && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setIsSearchResultsOpen(false)} />
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 10 }}
                    className="absolute left-0 right-0 top-full mt-2 bg-white border border-slate-200 rounded-2xl shadow-2xl z-50 overflow-hidden"
                  >
                    <div className="p-3 border-b border-slate-100 bg-slate-50/50">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">搜索结果</p>
                    </div>
                    <div className="max-h-[300px] overflow-y-auto custom-scrollbar">
                      {stations
                        .filter(s => 
                          s.name_cn.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          s.network_name_cn.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          s.country.toLowerCase().includes(searchQuery.toLowerCase())
                        )
                        .slice(0, 8)
                        .map(s => (
                          <button
                            key={s.id}
                            onClick={() => {
                              setFocusedStation(s);
                              setSelectedStation(null);
                              zoomToStation(s);
                              setSearchQuery('');
                              setIsSearchResultsOpen(false);
                              setActiveTab('map');
                            }}
                            className="w-full flex items-center gap-3 p-3 hover:bg-slate-50 transition-colors text-left border-b border-slate-50 last:border-0"
                          >
                            <div className="p-2 bg-emerald-50 rounded-lg text-emerald-600">
                              <MapPin className="w-4 h-4" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-bold text-slate-900 truncate">{s.name_cn}</p>
                              <p className="text-[10px] text-slate-500 font-medium truncate">{s.network_name_cn} · {s.country}</p>
                            </div>
                            <ChevronRight className="w-3 h-3 text-slate-300" />
                          </button>
                        ))}
                      {stations.filter(s => 
                        s.name_cn.toLowerCase().includes(searchQuery.toLowerCase()) ||
                        s.network_name_cn.toLowerCase().includes(searchQuery.toLowerCase()) ||
                        s.country.toLowerCase().includes(searchQuery.toLowerCase())
                      ).length === 0 && (
                        <div className="p-8 text-center">
                          <p className="text-xs text-slate-400 font-medium">未找到匹配的站点</p>
                        </div>
                      )}
                    </div>
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </div>

          <div className="hidden lg:flex items-center gap-2 px-4 py-2 bg-emerald-50 border border-emerald-100 rounded-full shrink-0">
            <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
            <p className="text-[10px] font-bold text-emerald-700 whitespace-nowrap">
              全球活跃站点: <span className="text-emerald-600">{filteredCount}</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div 
            className="relative p-2 transition-colors rounded-lg hover:bg-slate-100 text-slate-400 group cursor-pointer"
          >
            <ShoppingCart className="w-5 h-5" />
            {cart.length > 0 && (
              <span className="absolute top-1.5 right-1.5 w-4 h-4 bg-rose-500 text-white text-[8px] font-black flex items-center justify-center rounded-full border border-white">
                {cart.length}
              </span>
            )}
            {/* Cart Tooltip/Dropdown Wrapper (pt-2 to bridge the hover gap) */}
            <div className="absolute top-full right-0 pt-2 opacity-0 group-hover:opacity-100 pointer-events-none group-hover:pointer-events-auto transition-all z-50">
              <div className="w-64 bg-white border border-slate-200 rounded-2xl shadow-2xl p-4">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">购物车 ({cart.length})</p>
                {cart.length === 0 ? (
                  <p className="text-xs text-slate-400 py-4 text-center">购物车是空的</p>
                ) : (
                  <div className="space-y-3">
                    {cart.slice(0, 3).map((item, idx) => (
                      <div key={idx} className="flex items-center gap-3 pb-2 border-b border-slate-50 last:border-0">
                        <div className="p-2 bg-emerald-50 rounded-lg text-emerald-600">
                          <Database className="w-3 h-3" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[10px] font-bold text-slate-900 truncate">{item.station_name}</p>
                          <p className="text-[8px] text-slate-500 truncate">{item.param_name} · {item.time_range}</p>
                        </div>
                        <p className="text-[10px] font-black text-slate-900">¥{item.price}</p>
                      </div>
                    ))}
                    {cart.length > 3 && <p className="text-[8px] text-slate-400 text-center">还有 {cart.length - 3} 项...</p>}
                    <button 
                      onClick={() => { setActiveTab('cart'); setCheckoutStep('cart'); }}
                      className="w-full mt-2 py-2 bg-emerald-600 text-white rounded-xl text-[10px] font-bold shadow-lg shadow-emerald-600/20"
                    >
                      去结算
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          <button 
            onClick={() => setIsNotificationOpen(true)}
            className="relative p-2 transition-colors rounded-lg hover:bg-slate-100 text-slate-400"
          >
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
                      {(user.role === 'admin' || user.role === 'partner') && (
                        <button 
                          onClick={() => { setActiveTab('management'); setIsUserMenuOpen(false); }}
                          className="flex items-center w-full gap-3 px-3 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50 hover:text-emerald-600 rounded-lg transition-colors"
                        >
                          <Settings className="w-4 h-4" />
                          管理中心
                        </button>
                      )}
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

            {activeTab === 'station-detail' && selectedStation && (
              <div className="h-full w-full bg-slate-50 overflow-hidden flex flex-col">
                {/* Full Page Header */}
                <div className="p-8 border-b border-slate-200 flex items-center justify-between bg-white shrink-0">
                  <div className="flex items-center gap-6">
                    <button 
                      onClick={() => setActiveTab('map')}
                      className="p-3 bg-slate-100 hover:bg-slate-200 text-slate-500 rounded-2xl transition-all"
                    >
                      <ChevronRight className="w-6 h-6 rotate-180" />
                    </button>
                    <div className="p-4 bg-emerald-600 rounded-3xl shadow-xl shadow-emerald-600/20">
                      <MapPin className="w-8 h-8 text-white" />
                    </div>
                    <div>
                      <div className="flex items-center gap-3">
                        <h2 className="text-3xl font-black text-slate-900 tracking-tighter">{selectedStation.name_cn}</h2>
                        <span className="px-3 py-1 bg-emerald-50 text-emerald-600 rounded-full text-[10px] font-black uppercase tracking-widest border border-emerald-100">
                          {selectedStation.network_name_cn}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 font-bold uppercase tracking-[0.2em] mt-1">{selectedStation.name_en}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <button 
                      onClick={() => {
                        setFavorites(prev => 
                          prev.includes(selectedStation.id) 
                            ? prev.filter(id => id !== selectedStation.id) 
                            : [...prev, selectedStation.id]
                        );
                      }}
                      className={cn(
                        "flex items-center gap-2 px-6 py-3 rounded-2xl font-bold transition-all border",
                        favorites.includes(selectedStation.id)
                          ? "bg-rose-50 border-rose-100 text-rose-500 shadow-sm"
                          : "bg-white border-slate-200 text-slate-400 hover:border-slate-300"
                      )}
                    >
                      <Heart className={cn("w-4 h-4", favorites.includes(selectedStation.id) && "fill-current")} />
                      {favorites.includes(selectedStation.id) ? '已收藏' : '加入收藏'}
                    </button>
                  </div>
                </div>

                {/* Tabs Navigation */}
                <div className="px-8 bg-white border-b border-slate-200 flex items-center gap-8 shrink-0">
                  {[
                    { id: 'info', label: '站点信息', icon: Info },
                    { id: 'equipment', label: '站点设备', icon: Cpu },
                    { id: 'data', label: '站点数据', icon: Database },
                  ].map(tab => (
                    <button
                      key={tab.id}
                      onClick={() => setStationDetailTab(tab.id)}
                      className={cn(
                        "py-4 text-sm font-black transition-all relative",
                        stationDetailTab === tab.id ? "text-emerald-600" : "text-slate-400 hover:text-slate-600"
                      )}
                    >
                      <div className="flex items-center gap-2">
                        <tab.icon className="w-4 h-4" />
                        {tab.label}
                      </div>
                      {stationDetailTab === tab.id && (
                        <motion.div layoutId="activeTabIndicator" className="absolute bottom-0 left-0 right-0 h-1 bg-emerald-600 rounded-full" />
                      )}
                    </button>
                  ))}
                </div>

                {/* Content Area */}
                <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
                  <AnimatePresence mode="wait">
                    <motion.div
                      key={stationDetailTab}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      transition={{ duration: 0.2 }}
                      className="h-full"
                    >
                      {stationDetailTab === 'info' && (
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                          <div className="md:col-span-2 space-y-8">
                            <div className="grid grid-cols-2 gap-6">
                              <InfoItem label="中文名称" value={selectedStation.name_cn} />
                              <InfoItem label="英文名称" value={selectedStation.name_en} />
                              <InfoItem label="归属网络" value={selectedStation.network_name_cn} />
                              <InfoItem label="归属机构" value={selectedStation.organization} />
                              <InfoItem label="经纬度位置" value={`${selectedStation.lat.toFixed(6)}, ${selectedStation.lng.toFixed(6)}`} />
                              <InfoItem label="建设时间" value={selectedStation.build_time} />
                              <InfoItem label="数据起始时间" value={selectedStation.data_start_time} />
                              <InfoItem label="仪器数量" value={`${selectedStation.instrument_count} 台`} />
                            </div>
                            <div className="p-6 bg-white border border-slate-200 rounded-[24px] shadow-sm">
                              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-4">主要监测参数</p>
                              <div className="flex flex-wrap gap-2">
                                {(selectedStation.main_params || '').split(', ').filter(Boolean).map(p => (
                                  <span key={p} className="px-4 py-2 bg-emerald-50 text-emerald-600 rounded-xl text-xs font-bold border border-emerald-100">
                                    {p}
                                  </span>
                                ))}
                              </div>
                            </div>
                            <div className="p-6 bg-white border border-slate-200 rounded-[24px] shadow-sm">
                              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-4">仪器编号</p>
                              <p className="text-sm font-bold text-slate-700 leading-relaxed">{selectedStation.instrument_codes}</p>
                            </div>
                          </div>
                          <div className="space-y-6">
                            <div className="aspect-square bg-slate-200 rounded-[32px] overflow-hidden relative group">
                              <img 
                                src={`https://picsum.photos/seed/${selectedStation.id}/800/800`} 
                                alt="Station View" 
                                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                                referrerPolicy="no-referrer"
                              />
                              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent flex items-end p-6">
                                <p className="text-white text-xs font-bold">站点实景图</p>
                              </div>
                            </div>
                            <div className="p-6 bg-emerald-600 rounded-[32px] text-white shadow-xl shadow-emerald-600/20">
                              <p className="text-[10px] font-bold opacity-60 uppercase tracking-widest mb-2">运行状态</p>
                              <div className="flex items-center gap-3">
                                <div className="w-3 h-3 bg-white rounded-full animate-pulse" />
                                <span className="text-xl font-black">正常运行中</span>
                              </div>
                              <p className="text-[10px] mt-4 opacity-80 leading-relaxed">该站点目前所有传感器工作正常，数据传输延迟低于 50ms。</p>
                            </div>
                          </div>
                        </div>
                      )}

                      {stationDetailTab === 'equipment' && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          {stationInstruments.map(inst => (
                            <div key={inst.id} className="bg-white border border-slate-200 rounded-[32px] p-8 shadow-sm hover:border-emerald-500/30 transition-all group">
                              <div className="flex items-start justify-between mb-8">
                                <div className="flex items-center gap-4">
                                  <div className="p-4 bg-slate-50 rounded-2xl text-emerald-600 group-hover:bg-emerald-600 group-hover:text-white transition-colors">
                                    <Cpu className="w-6 h-6" />
                                  </div>
                                  <div>
                                    <h4 className="text-lg font-black text-slate-900 leading-none">{inst.name_cn}</h4>
                                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">{inst.name_en}</p>
                                  </div>
                                </div>
                                <div className={cn(
                                  "px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest",
                                  inst.status === 'normal' ? "bg-emerald-100 text-emerald-600" : "bg-rose-100 text-rose-600"
                                )}>
                                  {inst.status === 'normal' ? '运行中' : '异常告警'}
                                </div>
                              </div>

                              <div className="grid grid-cols-2 gap-x-8 gap-y-4 mb-8">
                                <EquipmentItem label="仪器编号" value={inst.code} />
                                <EquipmentItem label="测量原理" value={inst.principle} />
                                <EquipmentItem label="品牌型号" value={inst.brand_model} />
                                <EquipmentItem label="安装年份" value={`${inst.install_year}年`} />
                                <EquipmentItem label="更新频率" value={inst.update_frequency} />
                                <EquipmentItem label="数据起始" value={inst.data_start_time} />
                                <EquipmentItem label="管理员" value={inst.admin_contact} />
                                <EquipmentItem label="监测参数" value={inst.params} />
                              </div>

                              <div className="pt-6 border-t border-slate-100">
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-4">运行状态详情</p>
                                <div className="grid grid-cols-2 gap-4">
                                  <StatusBadge label="数据状态" status="正常" color="emerald" />
                                  <StatusBadge label="仪器状态" status="在线" color="emerald" />
                                  <StatusBadge label="用户状态" status="活跃" color="blue" />
                                  <StatusBadge label="使用痕迹" status="3次/日" color="slate" />
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                      {stationDetailTab === 'data' && (
                        <div className="bg-white border border-slate-200 rounded-[32px] overflow-hidden flex flex-col h-full shadow-sm">
                          <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                            <div className="flex items-center gap-4">
                              <div className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-600">
                                <Filter className="w-3.5 h-3.5" />
                                筛选条件
                              </div>
                              <select className="bg-white border border-slate-200 rounded-xl px-4 py-2 text-xs font-bold text-slate-600 focus:outline-none focus:border-emerald-500">
                                <option>所有监测类型</option>
                                <option>空气质量</option>
                                <option>温室气体</option>
                              </select>
                              <div className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-600">
                                <Calendar className="w-3.5 h-3.5" />
                                选择时间范围
                              </div>
                            </div>
                            <div className="flex items-center gap-3">
                              <button 
                                onClick={() => {
                                  const products = [
                                    { id: `cart-${Date.now()}`, station_name: selectedStation.name_cn, param_name: '综合监测数据包', time_range: '2023-2024', price: 199 }
                                  ];
                                  setCart(prev => [...prev, ...products]);
                                }}
                                className="px-6 py-2.5 bg-slate-900 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-lg shadow-slate-900/20"
                              >
                                <ShoppingCart className="w-3.5 h-3.5" />
                                加入购物车
                              </button>
                              <button className="px-6 py-2.5 bg-emerald-600 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-lg shadow-emerald-600/20">
                                <Download className="w-3.5 h-3.5" />
                                批量购买下载
                              </button>
                            </div>
                          </div>
                          <div className="flex-1 overflow-auto custom-scrollbar">
                            <table className="w-full text-left border-collapse">
                              <thead className="sticky top-0 bg-white z-10">
                                <tr>
                                  <th className="p-4 border-b border-slate-100">
                                    <input type="checkbox" className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500" />
                                  </th>
                                  <th className="p-4 border-b border-slate-100 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                                    <div className="flex items-center gap-2 cursor-pointer hover:text-slate-600">
                                      时间戳 <ArrowUpDown className="w-3 h-3" />
                                    </div>
                                  </th>
                                  <th className="p-4 border-b border-slate-100 text-[10px] font-bold text-slate-400 uppercase tracking-widest">监测参数</th>
                                  <th className="p-4 border-b border-slate-100 text-[10px] font-bold text-slate-400 uppercase tracking-widest">数值</th>
                                  <th className="p-4 border-b border-slate-100 text-[10px] font-bold text-slate-400 uppercase tracking-widest">数据版本</th>
                                  <th className="p-4 border-b border-slate-100 text-[10px] font-bold text-slate-400 uppercase tracking-widest">操作</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-50">
                                {stationData.map((d, idx) => (
                                  <tr key={idx} className="hover:bg-slate-50 transition-colors group">
                                    <td className="p-4">
                                      <input type="checkbox" className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500" />
                                    </td>
                                    <td className="p-4 text-xs font-bold text-slate-700">{d.timestamp}</td>
                                    <td className="p-4">
                                      <span className="px-2 py-1 bg-blue-50 text-blue-600 rounded-lg text-[10px] font-bold">{d.param_name}</span>
                                    </td>
                                    <td className="p-4 text-xs font-black text-slate-900">{d.value.toFixed(2)}</td>
                                    <td className="p-4 text-[10px] font-bold text-slate-400 uppercase">{d.version}</td>
                                    <td className="p-4">
                                      <button className="p-2 text-slate-400 hover:text-emerald-600 transition-colors">
                                        <Download className="w-4 h-4" />
                                      </button>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      )}
                    </motion.div>
                  </AnimatePresence>
                </div>
              </div>
            )}

            {activeTab === 'map' && (
              <div className="h-full w-full">
                {renderMap()}
              </div>
            )}
            
            {activeTab === 'profile' && (
              <div className="h-full w-full">
                {renderPersonalCenter()}
              </div>
            )}

            {activeTab === 'management' && (
              <div className="h-full w-full">
                {renderManagementCenter()}
              </div>
            )}

            {activeTab === 'cart' && (
              <div className="h-full w-full">
                {renderCartPage()}
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
      {/* Notification Drawer */}
      <AnimatePresence>
        {isNotificationOpen && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsNotificationOpen(false)}
              className="fixed inset-0 bg-slate-900/20 backdrop-blur-sm z-[60]"
            />
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              onWheel={(e) => e.stopPropagation()}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed right-0 top-0 bottom-0 w-80 bg-white shadow-2xl z-[70] flex flex-col"
            >
              <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                <div>
                  <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider">通知中心</h3>
                  <p className="text-[10px] text-slate-400 font-bold mt-1 uppercase tracking-widest">Notification Center</p>
                </div>
                <button 
                  onClick={() => setIsNotificationOpen(false)}
                  className="p-2 hover:bg-white rounded-xl transition-colors text-slate-400 hover:text-slate-600 border border-transparent hover:border-slate-200"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
                {notifications.map(n => (
                  <div key={n.id} className="p-4 rounded-2xl bg-white border border-slate-100 shadow-sm hover:border-emerald-500/30 transition-all group">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <div className={cn(
                          "w-2 h-2 rounded-full",
                          n.type === 'success' ? 'bg-emerald-500' : n.type === 'warning' ? 'bg-amber-500' : 'bg-blue-500'
                        )} />
                        <span className="text-[11px] font-black text-slate-900 uppercase tracking-tight">{n.title}</span>
                      </div>
                      <span className="text-[9px] font-bold text-slate-400">{n.time}</span>
                    </div>
                    <p className="text-xs text-slate-500 leading-relaxed font-medium">{n.content}</p>
                  </div>
                ))}
              </div>
              <div className="p-4 border-t border-slate-100">
                <button className="w-full py-3 text-[11px] font-bold text-slate-400 hover:text-emerald-600 transition-colors uppercase tracking-widest">
                  清除所有通知
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
