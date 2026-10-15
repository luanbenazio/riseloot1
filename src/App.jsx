import React, { useState, useEffect } from 'react';
import { Shield, Users, Database, Sword, Plus, Trash2, Package, History, Clock, X, Send, LogIn, LogOut, UserPlus, ListOrdered, Crown, CheckCircle, Flag, Map, Activity } from 'lucide-react';
import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  signInAnonymously, 
  signInWithCustomToken, 
  onAuthStateChanged
} from 'firebase/auth';
import { getFirestore, doc, setDoc, onSnapshot } from 'firebase/firestore';

// --- FIREBASE INIT ---
const firebaseConfig = typeof __firebase_config !== 'undefined' ? JSON.parse(__firebase_config) : {};
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const appId = typeof __app_id !== 'undefined' ? __app_id : 'guild-manager-default';

export default function App() {
  const [user, setUser] = useState(null);
  const [activeTab, setActiveTab] = useState('bank');
  const [loading, setLoading] = useState(true);
  
  // Guild State
  const [guildState, setGuildState] = useState({ players: [], bankItems: [], history: [], queues: [] });

  // Forms State
  const [newPlayerName, setNewPlayerName] = useState('');
  const [newItemName, setNewItemName] = useState('');
  const [newItemQty, setNewItemQty] = useState(1);
  const [newItemImageUrl, setNewItemImageUrl] = useState('');
  const [newQueueItemName, setNewQueueItemName] = useState('');
  const [newQueueImageUrl, setNewQueueImageUrl] = useState('');
  const [queuePlayerSelections, setQueuePlayerSelections] = useState({});
  
  const [newAllianceName, setNewAllianceName] = useState('');
  const [dungeonForm, setDungeonForm] = useState({ name: '', day: '', time: '' });
  const [statusForm, setStatusForm] = useState({ playerId: '', className: '', level: '', power: '' });

  // Auth Modal State
  const [authModal, setAuthModal] = useState({ isOpen: false });
  const [authForm, setAuthForm] = useState({ inviteCode: '' });
  const [authError, setAuthError] = useState('');

  // Modal State for Distribution
  const [distributeModal, setDistributeModal] = useState({
    isOpen: false,
    item: null,
    playerId: '',
    quantity: 1
  });

  // --- AUTHENTICATION ---
  useEffect(() => {
    const initAuth = async () => {
      try {
        if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
          await signInWithCustomToken(auth, __initial_auth_token);
        } else {
          await signInAnonymously(auth);
        }
      } catch (err) {
        console.error("Auth Error:", err);
      }
    };
    initAuth();

    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });
    return () => unsubscribe();
  }, []);

  const [isAdmin, setIsAdmin] = useState(localStorage.getItem('riseLootAdmin') === 'true');

  const handleAuthSubmit = async (e) => {
    e.preventDefault();
    setAuthError('');
    if (authForm.inviteCode === 'RISE2026') {
      setIsAdmin(true);
      localStorage.setItem('riseLootAdmin', 'true');
      setAuthModal({ isOpen: false });
      setAuthForm({ inviteCode: '' });
    } else {
      setAuthError('Código de convite inválido ou ausente.');
    }
  };

  const handleLogout = async () => {
    setIsAdmin(false);
    localStorage.removeItem('riseLootAdmin');
  };

  // --- FIREBASE DATA SETUP ---
  useEffect(() => {
    if (!user) return;

    const docRef = doc(db, 'artifacts', appId, 'public', 'data', 'guild', 'mainState');
    
    const unsubscribe = onSnapshot(docRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setGuildState({ 
          ...data, 
          history: data.history || [], 
          queues: data.queues || [],
          alliances: data.alliances || [],
          dungeons: data.dungeons || []
        });
      } else {
        const initialState = { players: [], bankItems: [], history: [], queues: [], alliances: [], dungeons: [] };
        if (isAdmin) {
          try {
            setDoc(docRef, initialState);
          } catch (e) {
            console.error("SetDoc Error:", e);
          }
        }
        setGuildState(initialState);
      }
      setLoading(false);
    }, (error) => {
      console.error("Firestore Error:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user, isAdmin]);

  // --- ACTIONS (Admin Only) ---
  const saveState = async (newState) => {
    if (!isAdmin) return;
    const docRef = doc(db, 'artifacts', appId, 'public', 'data', 'guild', 'mainState');
    await setDoc(docRef, newState);
  };

  const handleAddPlayer = (e) => {
    e.preventDefault();
    if (!newPlayerName.trim() || !isAdmin) return;
    
    const newPlayer = {
      id: crypto.randomUUID(),
      name: newPlayerName.trim(),
      items: []
    };
    
    const newState = { ...guildState, players: [...guildState.players, newPlayer] };
    saveState(newState);
    setNewPlayerName('');
  };

  const handleRemovePlayer = (id) => {
    if (!isAdmin) return;
    const newState = {
      ...guildState,
      players: guildState.players.filter(p => p.id !== id)
    };
    saveState(newState);
  };

  const handleAddBankItem = (e) => {
    e.preventDefault();
    if (!newItemName.trim() || newItemQty < 1 || !isAdmin) return;

    const existingItemIndex = guildState.bankItems.findIndex(i => i.name.toLowerCase() === newItemName.trim().toLowerCase());
    const newBankItems = [...guildState.bankItems];

    if (existingItemIndex >= 0) {
      newBankItems[existingItemIndex].quantity += parseInt(newItemQty);
      if (newItemImageUrl.trim()) {
        newBankItems[existingItemIndex].imageUrl = newItemImageUrl.trim();
      }
    } else {
      newBankItems.push({
        id: crypto.randomUUID(),
        name: newItemName.trim(),
        quantity: parseInt(newItemQty),
        imageUrl: newItemImageUrl.trim()
      });
    }

    const newState = { ...guildState, bankItems: newBankItems };
    saveState(newState);
    setNewItemName('');
    setNewItemQty(1);
    setNewItemImageUrl('');
  };

  const handleRemoveBankItem = (id) => {
    if (!isAdmin) return;
    const newState = {
      ...guildState,
      bankItems: guildState.bankItems.filter(i => i.id !== id)
    };
    saveState(newState);
  };

  const openDistributeModal = (item) => {
    if (!isAdmin) return;
    setDistributeModal({
      isOpen: true,
      item: item,
      playerId: guildState.players.length > 0 ? guildState.players[0].id : '',
      quantity: 1
    });
  };

  const closeDistributeModal = () => {
    setDistributeModal({ isOpen: false, item: null, playerId: '', quantity: 1 });
  };

  const handleExecuteDistribution = (e) => {
    e.preventDefault();
    if (!isAdmin) return;

    const { item, playerId, quantity } = distributeModal;
    if (!item || !playerId || quantity < 1) return;

    const bankItemIndex = guildState.bankItems.findIndex(i => i.id === item.id);
    const playerIndex = guildState.players.findIndex(p => p.id === playerId);

    if (bankItemIndex === -1 || playerIndex === -1) return;

    const bankItem = guildState.bankItems[bankItemIndex];
    const targetPlayer = guildState.players[playerIndex];
    const qtyToMove = Math.min(parseInt(quantity), bankItem.quantity);

    if (qtyToMove <= 0) return;

    const newState = JSON.parse(JSON.stringify(guildState));

    // Update bank
    newState.bankItems[bankItemIndex].quantity -= qtyToMove;
    if (newState.bankItems[bankItemIndex].quantity <= 0) {
      newState.bankItems.splice(bankItemIndex, 1);
    }

    // Update player
    const playerItemIndex = newState.players[playerIndex].items.findIndex(i => i.name === bankItem.name);
    if (playerItemIndex >= 0) {
      newState.players[playerIndex].items[playerItemIndex].quantity += qtyToMove;
    } else {
      newState.players[playerIndex].items.push({
        id: crypto.randomUUID(),
        name: bankItem.name,
        quantity: qtyToMove
      });
    }

    // Add to history
    const logEntry = {
      id: crypto.randomUUID(),
      itemName: bankItem.name,
      playerName: targetPlayer.name,
      quantity: qtyToMove,
      timestamp: new Date().toISOString()
    };
    newState.history = [logEntry, ...(newState.history || [])];

    saveState(newState);
    closeDistributeModal();
  };

  const publicSaveState = async (newState) => {
    const docRef = doc(db, 'artifacts', appId, 'public', 'data', 'guild', 'mainState');
    await setDoc(docRef, newState);
  };

  const handleAddAlliance = (e) => {
    e.preventDefault();
    if (!newAllianceName.trim() || !isAdmin) return;
    const newAlliance = { id: crypto.randomUUID(), name: newAllianceName.trim() };
    saveState({ ...guildState, alliances: [...(guildState.alliances || []), newAlliance] });
    setNewAllianceName('');
  };

  const handleRemoveAlliance = (id) => {
    if (!isAdmin) return;
    saveState({ ...guildState, alliances: (guildState.alliances || []).filter(a => a.id !== id) });
  };

  const handleAddDungeon = (e) => {
    e.preventDefault();
    if (!dungeonForm.name.trim() || !dungeonForm.day.trim() || !dungeonForm.time.trim() || !isAdmin) return;
    const newDungeon = { 
      id: crypto.randomUUID(), 
      name: dungeonForm.name.trim(),
      day: dungeonForm.day.trim(),
      time: dungeonForm.time.trim()
    };
    saveState({ ...guildState, dungeons: [...(guildState.dungeons || []), newDungeon] });
    setDungeonForm({ name: '', day: '', time: '' });
  };

  const handleRemoveDungeon = (id) => {
    if (!isAdmin) return;
    saveState({ ...guildState, dungeons: (guildState.dungeons || []).filter(d => d.id !== id) });
  };

  const handleUpdateStatus = (e) => {
    e.preventDefault();
    if (!statusForm.playerId) return;
    
    const newState = { ...guildState };
    const playerIndex = newState.players.findIndex(p => p.id === statusForm.playerId);
    
    if (playerIndex >= 0) {
      newState.players[playerIndex].status = {
        className: statusForm.className,
        level: statusForm.level,
        power: statusForm.power,
        updatedAt: new Date().toISOString()
      };
      publicSaveState(newState);
      setStatusForm({ playerId: '', className: '', level: '', power: '' });
    }
  };

  // --- QUEUE ACTIONS ---
  const handleAddQueue = (e) => {
    e.preventDefault();
    if (!newQueueItemName.trim() || !isAdmin) return;
    const newQueue = { 
      id: crypto.randomUUID(), 
      itemName: newQueueItemName.trim(), 
      imageUrl: newQueueImageUrl.trim(),
      waiting: [] 
    };
    saveState({ ...guildState, queues: [...(guildState.queues || []), newQueue] });
    setNewQueueItemName('');
    setNewQueueImageUrl('');
  };

  const handleRemoveQueue = (queueId) => {
    if (!isAdmin) return;
    saveState({ ...guildState, queues: (guildState.queues || []).filter(q => q.id !== queueId) });
  };

  const handleAddPlayerToQueue = (queueId) => {
    if (!isAdmin) return;
    const playerId = queuePlayerSelections[queueId];
    if (!playerId) return;

    const player = guildState.players.find(p => p.id === playerId);
    if (!player) return;

    const newQueues = [...(guildState.queues || [])];
    const qIndex = newQueues.findIndex(q => q.id === queueId);
    if (qIndex === -1) return;

    // Evita adicionar o mesmo player duas vezes na mesma fila
    if (newQueues[qIndex].waiting.some(w => w.id === player.id)) return;

    newQueues[qIndex].waiting.push({ id: player.id, name: player.name });
    saveState({ ...guildState, queues: newQueues });
    setQueuePlayerSelections(prev => ({ ...prev, [queueId]: '' }));
  };

  const handleAdvanceQueue = (queueId) => {
    if (!isAdmin) return;
    const newQueues = [...(guildState.queues || [])];
    const qIndex = newQueues.findIndex(q => q.id === queueId);
    if (qIndex === -1 || newQueues[qIndex].waiting.length === 0) return;

    newQueues[qIndex].waiting.shift(); // Remove o primeiro player (prioridade recebida)
    saveState({ ...guildState, queues: newQueues });
  };

  const formatDate = (isoString) => {
    const date = new Date(isoString);
    return date.toLocaleString('pt-BR', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });
  };

  // --- UI RENDER ---
  if (loading) {
    return <div className="min-h-screen bg-slate-950 text-purple-500 flex items-center justify-center font-bold text-xl">Carregando RISELOOT...</div>;
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 font-sans selection:bg-purple-500/30 pb-20">
      
      {/* Header */}
      <header className="bg-slate-900 border-b border-purple-900/50 p-6 shadow-lg shadow-purple-900/20 sticky top-0 z-30">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-purple-600/20 rounded-xl border border-purple-500/30 text-purple-400 shadow-[0_0_15px_rgba(168,85,247,0.3)]">
              <Shield size={32} />
            </div>
            <div>
              <h1 className="text-3xl font-black tracking-tight text-white uppercase drop-shadow-[0_0_10px_rgba(168,85,247,0.6)]">
                RISE<span className="text-purple-500">LOOT</span>
              </h1>
              <div className="flex items-center gap-2 mt-1">
                <span className={`w-2 h-2 rounded-full ${isAdmin ? 'bg-green-500' : 'bg-slate-500'} shadow-[0_0_5px_currentColor]`}></span>
                <p className="text-[10px] text-purple-400 uppercase tracking-widest font-bold">
                  {isAdmin ? 'Painel de Administrador' : 'Modo Visitante (Leitura)'}
                </p>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-6">
            <nav className="flex flex-wrap justify-center bg-slate-950 p-1 rounded-xl border border-slate-800 gap-1">
              <button 
                onClick={() => setActiveTab('bank')}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'bank' ? 'bg-purple-600 text-white shadow-md' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}
              >
                <Database size={16} /> Inventário
              </button>
              <button 
                onClick={() => setActiveTab('members')}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'members' ? 'bg-purple-600 text-white shadow-md' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}
              >
                <Users size={16} /> Players
              </button>
              <button 
                onClick={() => setActiveTab('queues')}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'queues' ? 'bg-purple-600 text-white shadow-md' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}
              >
                <ListOrdered size={16} /> Fila
              </button>
              <button 
                onClick={() => setActiveTab('history')}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'history' ? 'bg-purple-600 text-white shadow-md' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}
              >
                <History size={16} /> Histórico
              </button>
              <button 
                onClick={() => setActiveTab('alliance')}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'alliance' ? 'bg-purple-600 text-white shadow-md' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}
              >
                <Flag size={16} /> Aliança
              </button>
              <button 
                onClick={() => setActiveTab('dungeon')}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'dungeon' ? 'bg-purple-600 text-white shadow-md' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}
              >
                <Map size={16} /> Masmorras
              </button>
              <button 
                onClick={() => setActiveTab('status')}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'status' ? 'bg-purple-600 text-white shadow-md' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}
              >
                <Activity size={16} /> Status
              </button>
            </nav>

            {/* Auth Buttons */}
            {isAdmin ? (
              <button onClick={handleLogout} className="text-sm flex items-center gap-2 text-slate-400 hover:text-red-400 transition-colors bg-slate-800 hover:bg-slate-800/80 px-3 py-2 rounded-lg">
                <LogOut size={16} /> Sair
              </button>
            ) : (
              <button 
                onClick={() => setAuthModal({ isOpen: true })} 
                className="text-sm flex items-center gap-2 bg-purple-600/20 text-purple-400 hover:bg-purple-600 hover:text-white px-4 py-2 rounded-lg transition-all border border-purple-500/30"
              >
                <LogIn size={16} /> Admin Login
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto p-4 md:p-6 mt-4">
        
        {/* BANK TAB */}
        {activeTab === 'bank' && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
            
            {isAdmin && (
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
                <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                  <Plus size={20} className="text-purple-500"/> Adicionar Item ao Banco
                </h2>
                <form onSubmit={handleAddBankItem} className="flex flex-col gap-3">
                  <div className="flex flex-col sm:flex-row gap-3">
                    <input 
                      type="text" 
                      value={newItemName}
                      onChange={(e) => setNewItemName(e.target.value)}
                      placeholder="Nome do Item (ex: Espada Larga)..." 
                      className="flex-1 bg-slate-950 border border-slate-800 rounded-lg px-4 py-3 text-slate-200 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-all placeholder:text-slate-600"
                    />
                    <input 
                      type="text" 
                      value={newItemImageUrl}
                      onChange={(e) => setNewItemImageUrl(e.target.value)}
                      placeholder="URL da Imagem (opcional)..." 
                      className="flex-1 bg-slate-950 border border-slate-800 rounded-lg px-4 py-3 text-slate-200 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-all placeholder:text-slate-600"
                    />
                  </div>
                  <div className="flex gap-3 sm:justify-end">
                    <input 
                      type="number" 
                      min="1"
                      value={newItemQty}
                      onChange={(e) => setNewItemQty(e.target.value)}
                      placeholder="Qtd" 
                      className="w-24 bg-slate-950 border border-slate-800 rounded-lg px-4 py-3 text-slate-200 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-all"
                    />
                    <button type="submit" className="bg-purple-600 hover:bg-purple-500 text-white px-6 py-3 rounded-lg font-bold transition-colors whitespace-nowrap">
                      Guardar
                    </button>
                  </div>
                </form>
              </div>
            )}

            <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
              <div className="p-5 bg-slate-800/40 border-b border-slate-800 flex justify-between items-center">
                <h3 className="font-bold text-white flex items-center gap-2">
                  <Database size={18} className="text-purple-400" /> Itens Disponíveis
                </h3>
                <span className="text-xs font-bold bg-purple-900/50 text-purple-300 border border-purple-700/50 px-3 py-1 rounded-full">
                  {guildState.bankItems.length} Tipos
                </span>
              </div>
              
              <div className="p-0">
                {guildState.bankItems.length === 0 ? (
                  <div className="p-16 text-center text-slate-500 flex flex-col items-center gap-3">
                    <Package size={48} className="text-slate-800" />
                    <p>O banco da guilda está vazio no momento.</p>
                  </div>
                ) : (
                  <div className="divide-y divide-slate-800/50">
                    {guildState.bankItems.map(item => (
                      <div key={item.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-5 hover:bg-slate-800/30 transition-colors gap-4">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-xl bg-slate-950 border border-purple-900/50 flex items-center justify-center text-purple-500 shadow-inner overflow-hidden shrink-0">
                            {item.imageUrl ? (
                              <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover" />
                            ) : (
                              <Package size={24} />
                            )}
                          </div>
                          <div>
                            <p className="font-bold text-slate-100 text-lg">{item.name}</p>
                            <p className="text-sm font-semibold text-slate-400">
                              Em Estoque: <span className="text-purple-400">{item.quantity}</span>
                            </p>
                          </div>
                        </div>
                        
                        {isAdmin && (
                          <div className="flex items-center gap-3 self-end sm:self-auto w-full sm:w-auto">
                            <button 
                              onClick={() => openDistributeModal(item)} 
                              className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 bg-purple-600/20 hover:bg-purple-600 border border-purple-600/50 hover:border-purple-500 text-purple-300 hover:text-white rounded-lg transition-all font-bold text-sm"
                            >
                              <Send size={16} /> Distribuir
                            </button>
                            <button 
                              onClick={() => handleRemoveBankItem(item.id)} 
                              className="p-2 text-slate-500 hover:bg-red-500/20 hover:text-red-400 rounded-lg transition-colors border border-transparent hover:border-red-500/30"
                              title="Remover Item"
                            >
                              <Trash2 size={20} />
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* QUEUES TAB */}
        {activeTab === 'queues' && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
            
            {isAdmin && (
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
                <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                  <Plus size={20} className="text-purple-500"/> Criar Fila de Item Raro
                </h2>
                <form onSubmit={handleAddQueue} className="flex flex-col gap-3">
                  <div className="flex flex-col sm:flex-row gap-3">
                    <input 
                      type="text" 
                      value={newQueueItemName}
                      onChange={(e) => setNewQueueItemName(e.target.value)}
                      placeholder="Nome do Item Raro (ex: Montaria Épica)..." 
                      className="flex-1 bg-slate-950 border border-slate-800 rounded-lg px-4 py-3 text-slate-200 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-all placeholder:text-slate-600"
                    />
                    <input 
                      type="text" 
                      value={newQueueImageUrl}
                      onChange={(e) => setNewQueueImageUrl(e.target.value)}
                      placeholder="URL da Imagem (opcional)..." 
                      className="flex-1 bg-slate-950 border border-slate-800 rounded-lg px-4 py-3 text-slate-200 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-all placeholder:text-slate-600"
                    />
                  </div>
                  <div className="flex sm:justify-end">
                    <button type="submit" className="w-full sm:w-auto bg-purple-600 hover:bg-purple-500 text-white px-6 py-3 rounded-lg font-bold transition-colors">
                      Criar Fila
                    </button>
                  </div>
                </form>
              </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {(!guildState.queues || guildState.queues.length === 0) ? (
                <div className="col-span-full py-16 text-center text-slate-500 border border-dashed border-slate-800 rounded-2xl flex flex-col items-center gap-3">
                  <ListOrdered size={48} className="text-slate-700" />
                  Nenhuma fila de item raro foi criada ainda.
                </div>
              ) : (
                guildState.queues.map(queue => (
                  <div key={queue.id} className="bg-slate-900 border border-slate-800 rounded-2xl flex flex-col overflow-hidden shadow-xl">
                    <div className="p-4 bg-slate-800/40 border-b border-slate-800 flex justify-between items-center">
                      <h3 className="font-bold text-white text-lg flex items-center gap-2">
                        {queue.imageUrl ? (
                          <img src={queue.imageUrl} alt={queue.itemName} className="w-6 h-6 rounded object-cover border border-purple-500/50" />
                        ) : (
                          <Package size={18} className="text-purple-500" />
                        )}
                        {queue.itemName}
                      </h3>
                      {isAdmin && (
                        <button 
                          onClick={() => handleRemoveQueue(queue.id)} 
                          className="text-slate-500 hover:text-red-400 p-1.5 rounded-lg transition-colors hover:bg-red-500/20"
                          title="Excluir Fila"
                        >
                          <Trash2 size={18} />
                        </button>
                      )}
                    </div>
                    
                    <div className="p-4 flex-1 bg-slate-950/30">
                      {isAdmin && (
                        <div className="flex gap-2 mb-4">
                          <select 
                            value={queuePlayerSelections[queue.id] || ''}
                            onChange={(e) => setQueuePlayerSelections(prev => ({ ...prev, [queue.id]: e.target.value }))}
                            className="flex-1 bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-purple-500"
                          >
                            <option value="">Selecione um player...</option>
                            {guildState.players.map(player => (
                              <option key={player.id} value={player.id}>{player.name}</option>
                            ))}
                          </select>
                          <button 
                            onClick={() => handleAddPlayerToQueue(queue.id)}
                            className="bg-purple-600/20 hover:bg-purple-600 text-purple-300 hover:text-white border border-purple-600/50 px-3 py-2 rounded-lg font-bold text-sm transition-all"
                          >
                            Adicionar
                          </button>
                        </div>
                      )}

                      {queue.waiting.length === 0 ? (
                        <p className="text-sm text-slate-500 italic text-center py-6">Ninguém na fila para este item.</p>
                      ) : (
                        <ul className="space-y-3">
                          {queue.waiting.map((player, index) => {
                            const isPriority = index === 0;
                            return (
                              <li key={player.id} className={`relative flex items-center justify-between p-3 rounded-xl border ${isPriority ? 'bg-purple-900/20 border-purple-500 shadow-[0_0_10px_rgba(168,85,247,0.15)]' : 'bg-slate-900 border-slate-800'}`}>
                                <div className="flex items-center gap-3">
                                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-black ${isPriority ? 'bg-purple-600 text-white' : 'bg-slate-800 text-slate-400'}`}>
                                    {index + 1}
                                  </div>
                                  <div>
                                    <span className={`font-bold block ${isPriority ? 'text-purple-300 text-base' : 'text-slate-300 text-sm'}`}>
                                      {player.name}
                                    </span>
                                    {isPriority && <span className="text-[10px] uppercase font-black text-purple-400 tracking-wider flex items-center gap-1"><Crown size={12}/> Prioridade Atual</span>}
                                  </div>
                                </div>
                                {isAdmin && isPriority && (
                                  <button 
                                    onClick={() => handleAdvanceQueue(queue.id)}
                                    className="flex items-center gap-2 bg-green-500/20 hover:bg-green-500 text-green-400 hover:text-white px-3 py-1.5 rounded-lg text-xs font-bold transition-all border border-green-500/30"
                                    title="Marcar como entregue e avançar fila"
                                  >
                                    <CheckCircle size={14} /> Entregue
                                  </button>
                                )}
                              </li>
                            );
                          })}
                        </ul>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* HISTORY TAB */}
        {activeTab === 'history' && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
              <div className="p-6 bg-slate-800/40 border-b border-slate-800 flex items-center gap-3">
                <History size={24} className="text-purple-500" />
                <div>
                  <h2 className="text-xl font-bold text-white">Log de Distribuição</h2>
                  <p className="text-sm text-slate-400">Histórico de itens enviados para players</p>
                </div>
              </div>
              
              <div className="p-0">
                {!guildState.history || guildState.history.length === 0 ? (
                  <div className="p-16 text-center text-slate-500 flex flex-col items-center gap-3">
                    <Clock size={48} className="text-slate-800" />
                    <p>Nenhum item foi distribuído ainda.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-slate-950/50 border-b border-slate-800 text-slate-400 text-sm uppercase tracking-wider">
                          <th className="p-4 font-semibold">Data/Hora</th>
                          <th className="p-4 font-semibold">Item</th>
                          <th className="p-4 font-semibold">Qtd</th>
                          <th className="p-4 font-semibold">Player</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/50">
                        {guildState.history.map((log) => (
                          <tr key={log.id} className="hover:bg-slate-800/20 transition-colors">
                            <td className="p-4 whitespace-nowrap text-sm text-slate-400 flex items-center gap-2">
                              <Clock size={14} className="text-purple-500/70" />
                              {formatDate(log.timestamp)}
                            </td>
                            <td className="p-4 font-medium text-slate-200">{log.itemName}</td>
                            <td className="p-4 text-purple-400 font-bold">x{log.quantity}</td>
                            <td className="p-4 text-slate-300 flex items-center gap-2">
                              <Users size={14} className="text-slate-500" />
                              {log.playerName}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ALLIANCE TAB */}
        {}
        {activeTab === 'alliance' && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
            {isAdmin && (
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
                <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                  <Plus size={20} className="text-purple-500"/> Adicionar Guilda à Aliança
                </h2>
                <form onSubmit={handleAddAlliance} className="flex flex-col sm:flex-row gap-3">
                  <input 
                    type="text" 
                    value={newAllianceName}
                    onChange={(e) => setNewAllianceName(e.target.value)}
                    placeholder="Nome da Guilda..." 
                    className="flex-1 bg-slate-950 border border-slate-800 rounded-lg px-4 py-3 text-slate-200 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-all placeholder:text-slate-600"
                  />
                  <button type="submit" className="bg-purple-600 hover:bg-purple-500 text-white px-6 py-3 rounded-lg font-bold transition-colors whitespace-nowrap">
                    Adicionar
                  </button>
                </form>
              </div>
            )}

            <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
              <div className="p-5 bg-slate-800/40 border-b border-slate-800 flex justify-between items-center">
                <h3 className="font-bold text-white flex items-center gap-2">
                  <Flag size={18} className="text-purple-400" /> Guildas Aliadas
                </h3>
                <span className="text-xs font-bold bg-purple-900/50 text-purple-300 border border-purple-700/50 px-3 py-1 rounded-full">
                  {(guildState.alliances || []).length} Guildas
                </span>
              </div>
              
              <div className="p-0">
                {(!guildState.alliances || guildState.alliances.length === 0) ? (
                  <div className="p-16 text-center text-slate-500 flex flex-col items-center gap-3">
                    <Flag size={48} className="text-slate-800" />
                    <p>Nenhuma guilda adicionada à aliança.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-6">
                    {guildState.alliances.map(alliance => (
                      <div key={alliance.id} className="bg-slate-950 border border-slate-800 rounded-xl p-4 flex items-center justify-between shadow-inner">
                        <span className="font-bold text-slate-200 flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-purple-900/30 flex items-center justify-center border border-purple-500/30">
                            <Shield size={14} className="text-purple-400" />
                          </div>
                          {alliance.name}
                        </span>
                        {isAdmin && (
                          <button 
                            onClick={() => handleRemoveAlliance(alliance.id)} 
                            className="p-2 text-slate-500 hover:bg-red-500/20 hover:text-red-400 rounded-lg transition-colors"
                          >
                            <Trash2 size={16} />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* DUNGEONS TAB */}
        {}
        {activeTab === 'dungeon' && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
            {isAdmin && (
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
                <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                  <Plus size={20} className="text-purple-500"/> Agendar Masmorra da Guilda
                </h2>
                <form onSubmit={handleAddDungeon} className="flex flex-col gap-3">
                  <div className="flex flex-col sm:flex-row gap-3">
                    <input 
                      type="text" 
                      value={dungeonForm.name}
                      onChange={(e) => setDungeonForm({...dungeonForm, name: e.target.value})}
                      placeholder="Nome da Masmorra..." 
                      className="flex-[2] bg-slate-950 border border-slate-800 rounded-lg px-4 py-3 text-slate-200 focus:outline-none focus:border-purple-500 transition-all"
                    />
                    <input 
                      type="text" 
                      value={dungeonForm.day}
                      onChange={(e) => setDungeonForm({...dungeonForm, day: e.target.value})}
                      placeholder="Dia da Semana..." 
                      className="flex-1 bg-slate-950 border border-slate-800 rounded-lg px-4 py-3 text-slate-200 focus:outline-none focus:border-purple-500 transition-all"
                    />
                    <input 
                      type="time" 
                      value={dungeonForm.time}
                      onChange={(e) => setDungeonForm({...dungeonForm, time: e.target.value})}
                      className="flex-1 bg-slate-950 border border-slate-800 rounded-lg px-4 py-3 text-slate-200 focus:outline-none focus:border-purple-500 transition-all"
                    />
                  </div>
                  <button type="submit" className="self-end bg-purple-600 hover:bg-purple-500 text-white px-6 py-3 rounded-lg font-bold transition-colors">
                    Adicionar Escala
                  </button>
                </form>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {(!guildState.dungeons || guildState.dungeons.length === 0) ? (
                <div className="col-span-full py-16 text-center text-slate-500 border border-dashed border-slate-800 rounded-2xl flex flex-col items-center gap-3">
                  <Map size={48} className="text-slate-700" />
                  Nenhuma masmorra agendada no momento.
                </div>
              ) : (
                guildState.dungeons.map(dungeon => (
                  <div key={dungeon.id} className="relative bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl group hover:border-purple-500/30 transition-colors">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-purple-600/5 rounded-full blur-3xl"></div>
                    <div className="p-6 relative z-10 flex flex-col h-full justify-between gap-4">
                      <div className="flex justify-between items-start">
                        <h3 className="font-bold text-xl text-white flex items-center gap-2">
                          <Map size={24} className="text-purple-500" />
                          {dungeon.name}
                        </h3>
                        {isAdmin && (
                          <button 
                            onClick={() => handleRemoveDungeon(dungeon.id)} 
                            className="p-1.5 text-slate-500 hover:text-red-400 hover:bg-red-500/20 rounded-lg transition-colors"
                          >
                            <Trash2 size={18} />
                          </button>
                        )}
                      </div>
                      <div className="flex gap-4">
                        <div className="bg-slate-950 border border-slate-800 rounded-lg px-4 py-2 flex-1">
                          <span className="block text-[10px] text-slate-500 uppercase font-bold tracking-wider">Dia</span>
                          <span className="text-slate-200 font-semibold">{dungeon.day}</span>
                        </div>
                        <div className="bg-slate-950 border border-slate-800 rounded-lg px-4 py-2 flex-1">
                          <span className="block text-[10px] text-slate-500 uppercase font-bold tracking-wider">Horário</span>
                          <span className="text-purple-400 font-bold">{dungeon.time}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* STATUS TAB */}
        {}
        {activeTab === 'status' && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
            <div className="bg-slate-900 border border-purple-500/30 rounded-2xl p-6 shadow-[0_0_20px_rgba(168,85,247,0.1)] relative overflow-hidden">
              <div className="absolute -right-20 -top-20 w-64 h-64 bg-purple-600/10 rounded-full blur-3xl pointer-events-none"></div>
              
              <h2 className="text-xl font-bold text-white mb-2 flex items-center gap-2 relative z-10">
                <Activity size={20} className="text-purple-500"/> Atualizar Meu Status
              </h2>
              <p className="text-sm text-slate-400 mb-6 relative z-10">Qualquer membro pode selecionar seu nome na lista para enviar e atualizar seu status atual (Classe, Level, Poder).</p>
              
              {guildState.players.length === 0 ? (
                <div className="bg-red-950/30 border border-red-900/50 p-4 rounded-xl text-red-400 text-sm">
                  Nenhum player cadastrado. Peça para o Admin adicionar membros primeiro.
                </div>
              ) : (
                <form onSubmit={handleUpdateStatus} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3 relative z-10">
                  <select 
                    required
                    value={statusForm.playerId}
                    onChange={(e) => setStatusForm({...statusForm, playerId: e.target.value})}
                    className="lg:col-span-1 bg-slate-950 border border-slate-700 rounded-lg px-4 py-3 text-slate-200 focus:outline-none focus:border-purple-500"
                  >
                    <option value="">Sou o Player...</option>
                    {guildState.players.map(player => (
                      <option key={player.id} value={player.id}>{player.name}</option>
                    ))}
                  </select>
                  <input 
                    type="text" 
                    required
                    value={statusForm.className}
                    onChange={(e) => setStatusForm({...statusForm, className: e.target.value})}
                    placeholder="Classe (ex: Mago)" 
                    className="lg:col-span-1 bg-slate-950 border border-slate-800 rounded-lg px-4 py-3 text-slate-200 focus:outline-none focus:border-purple-500"
                  />
                  <input 
                    type="number" 
                    required
                    value={statusForm.level}
                    onChange={(e) => setStatusForm({...statusForm, level: e.target.value})}
                    placeholder="Level" 
                    className="lg:col-span-1 bg-slate-950 border border-slate-800 rounded-lg px-4 py-3 text-slate-200 focus:outline-none focus:border-purple-500"
                  />
                  <input 
                    type="number" 
                    required
                    value={statusForm.power}
                    onChange={(e) => setStatusForm({...statusForm, power: e.target.value})}
                    placeholder="Poder/GS" 
                    className="lg:col-span-1 bg-slate-950 border border-slate-800 rounded-lg px-4 py-3 text-slate-200 focus:outline-none focus:border-purple-500"
                  />
                  <button type="submit" className="lg:col-span-1 bg-purple-600 hover:bg-purple-500 text-white px-6 py-3 rounded-lg font-bold transition-colors shadow-lg shadow-purple-900/30">
                    Enviar
                  </button>
                </form>
              )}
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
              <div className="p-5 bg-slate-800/40 border-b border-slate-800 flex justify-between items-center">
                <h3 className="font-bold text-white flex items-center gap-2">
                  <Users size={18} className="text-purple-400" /> Tabela de Força da Guilda
                </h3>
              </div>
              
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-950/50 border-b border-slate-800 text-slate-400 text-xs uppercase tracking-wider">
                      <th className="p-4 font-semibold">Player</th>
                      <th className="p-4 font-semibold text-center">Classe</th>
                      <th className="p-4 font-semibold text-center">Level</th>
                      <th className="p-4 font-semibold text-center text-purple-400">Poder / GS</th>
                      <th className="p-4 font-semibold text-right">Última Att.</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/50">
                    {guildState.players
                      .filter(p => p.status)
                      .sort((a, b) => (Number(b.status.power) || 0) - (Number(a.status.power) || 0))
                      .map((player) => (
                      <tr key={player.id} className="hover:bg-slate-800/20 transition-colors">
                        <td className="p-4 font-bold text-slate-200">{player.name}</td>
                        <td className="p-4 text-center text-slate-300">{player.status.className}</td>
                        <td className="p-4 text-center text-slate-300">{player.status.level}</td>
                        <td className="p-4 text-center text-purple-400 font-bold">{player.status.power}</td>
                        <td className="p-4 text-right text-xs text-slate-500">
                          {player.status.updatedAt ? formatDate(player.status.updatedAt) : 'N/A'}
                        </td>
                      </tr>
                    ))}
                    {guildState.players.filter(p => !p.status).map(player => (
                      <tr key={player.id} className="hover:bg-slate-800/20 transition-colors opacity-50">
                        <td className="p-4 font-bold text-slate-400">{player.name}</td>
                        <td className="p-4 text-center text-slate-600">-</td>
                        <td className="p-4 text-center text-slate-600">-</td>
                        <td className="p-4 text-center text-slate-600">-</td>
                        <td className="p-4 text-right text-xs text-slate-600">Pendente</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* AUTHENTICATION MODAL */}
      {authModal.isOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-sm shadow-2xl shadow-purple-900/20 overflow-hidden">
            <div className="flex justify-between items-center p-5 border-b border-slate-800 bg-slate-800/50">
              <h3 className="font-bold text-lg text-white flex items-center gap-2">
                <LogIn size={18} className="text-purple-400"/> Login Admin
              </h3>
              <button 
                onClick={() => setAuthModal({ isOpen: false })}
                className="text-slate-400 hover:text-white hover:bg-slate-700 p-1.5 rounded-lg transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={handleAuthSubmit} className="p-6 space-y-4">
              {authError && (
                <div className="bg-red-950/50 border border-red-900/50 text-red-400 text-sm p-3 rounded-lg text-center">
                  {authError}
                </div>
              )}

              <div className="space-y-1">
                <label className="text-xs font-bold text-purple-400 uppercase">Código de Convite</label>
                <input 
                  type="password" 
                  required
                  value={authForm.inviteCode}
                  onChange={(e) => setAuthForm({...authForm, inviteCode: e.target.value})}
                  className="w-full bg-slate-950 border border-purple-500/50 rounded-lg px-4 py-3 text-slate-200 focus:outline-none focus:border-purple-400 focus:ring-1 focus:ring-purple-400"
                  placeholder="Código secreto da guilda"
                />
              </div>

              <button 
                type="submit" 
                className="w-full bg-purple-600 hover:bg-purple-500 text-white px-6 py-3 rounded-xl font-bold transition-colors mt-4 shadow-lg shadow-purple-900/30"
              >
                Entrar
              </button>
            </form>
          </div>
        </div>
      )}

      {/* DISTRIBUTE MODAL */}
      {isAdmin && distributeModal.isOpen && distributeModal.item && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md shadow-2xl shadow-purple-900/20 overflow-hidden">
            
            <div className="flex justify-between items-center p-5 border-b border-slate-800 bg-slate-800/50">
              <h3 className="font-bold text-lg text-white flex items-center gap-2">
                <Send size={18} className="text-purple-400"/> Enviar Loot
              </h3>
              <button 
                onClick={closeDistributeModal}
                className="text-slate-400 hover:text-white hover:bg-slate-700 p-1.5 rounded-lg transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleExecuteDistribution} className="p-6 space-y-5">
              
              <div className="bg-slate-950 border border-slate-800 p-4 rounded-xl flex justify-between items-center">
                <span className="text-slate-300 font-medium">{distributeModal.item.name}</span>
                <span className="text-xs bg-slate-800 px-2 py-1 rounded text-slate-400">
                  Disp: <span className="text-purple-400 font-bold">{distributeModal.item.quantity}</span>
                </span>
              </div>

              {guildState.players.length === 0 ? (
                <div className="p-4 bg-red-950/30 border border-red-900/50 rounded-xl text-red-400 text-sm">
                  Adicione players na aba "Players" antes de distribuir itens.
                </div>
              ) : (
                <>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Enviar para (Player)</label>
                    <select 
                      value={distributeModal.playerId}
                      onChange={(e) => setDistributeModal({...distributeModal, playerId: e.target.value})}
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg px-4 py-3 text-slate-200 focus:outline-none focus:border-purple-500"
                    >
                      {guildState.players.map(player => (
                        <option key={player.id} value={player.id}>{player.name}</option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Quantidade</label>
                    <input 
                      type="number" 
                      min="1"
                      max={distributeModal.item.quantity}
                      value={distributeModal.quantity}
                      onChange={(e) => setDistributeModal({...distributeModal, quantity: e.target.value})}
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg px-4 py-3 text-slate-200 focus:outline-none focus:border-purple-500"
                    />
                  </div>

                  <button 
                    type="submit" 
                    className="w-full bg-purple-600 hover:bg-purple-500 text-white px-6 py-3.5 rounded-xl font-bold transition-colors mt-2 shadow-lg shadow-purple-900/30 flex justify-center items-center gap-2"
                  >
                    Confirmar Envio
                  </button>
                </>
              )}
            </form>
          </div>
        </div>
      )}
      
      {/* Scrollbar styling */}
      <style dangerouslySetInnerHTML={{__html: `
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #334155; border-radius: 4px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #475569; }
      `}} />
    </div>
  );
}