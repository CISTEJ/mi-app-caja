import React, { useState, useEffect, useMemo } from 'react';
import { initializeApp } from 'firebase/app';
import { 
    getAuth, 
    onAuthStateChanged,
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    signOut
} from 'firebase/auth';
import { 
    getFirestore, 
    collection, 
    addDoc, 
    query, 
    onSnapshot,
    doc,
    updateDoc,
    serverTimestamp,
    setDoc,
    getDoc,
    getDocs
} from 'firebase/firestore';

// --- CONFIGURACIÓN DE FIREBASE ---
// REEMPLAZA ESTOS VALORES DE MARCADOR DE POSICIÓN CON LA CONFIGURACIÓN DE TU PROYECTO DE FIREBASE
const firebaseConfig = {
    apiKey: "AIzaSyDaKoae1hfnDPJlWLiM64fDq1-hPRivn44",
  authDomain: "cashing-out-app.firebaseapp.com",
  projectId: "cashing-out-app",
  storageBucket: "cashing-out-app.firebasestorage.app",
  messagingSenderId: "699989995395",
  appId: "1:699989995395:web:d32b3ecdaa3fbc5f6550b6",
  measurementId: "G-PZFWQDQM2K"
};
const appId = 'cierre-caja-app';

// --- Iconos ---
const icons = {
  cash: <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-2 inline" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" /></svg>,
  reports: <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 inline" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>,
  add: <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>,
  user: <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 inline" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>,
  back: <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>,
  print: <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm7-9a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2h9a2 2 0 002-2V9z" /></svg>,
  logout: <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>,
  admin: <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 inline" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>,
};

// --- Helpers ---
const formatCurrency = (value) => new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', minimumFractionDigits: 0 }).format(value);
const DENOMINATIONS = { billetes: [20000, 10000, 5000, 2000, 1000], monedas: [500, 100, 50, 10] };
const initialReportState = {
    creadoPorNombre: '',
    denominaciones: { billete20000: 0, billete10000: 0, billete5000: 0, billete2000: 0, billete1000: 0, moneda500: 0, moneda100: 0, moneda50: 0, moneda10: 0 },
    montos: { efectivoTeorico: 0, debitoTeorico: 0, creditoTeorico: 0, prepagoTeorico: 0, transferenciaTeorica: 0, debitoReal: 0, creditoReal: 0, prepagoReal: 0, transferenciaReal: 0 },
    observaciones: '',
};

// --- COMPONENTES ---

const LoginScreen = ({ auth, db }) => {
    const [isLogin, setIsLogin] = useState(true);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [nombre, setNombre] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            if (isLogin) {
                await signInWithEmailAndPassword(auth, email, password);
            } else {
                if (!nombre.trim()) {
                    setError("El nombre es obligatorio para registrarse.");
                    setLoading(false);
                    return;
                }
                const userCredential = await createUserWithEmailAndPassword(auth, email, password);
                const user = userCredential.user;
                await setDoc(doc(db, "users", user.uid), {
                    uid: user.uid,
                    nombre: nombre,
                    email: user.email,
                    role: 'usuario'
                });
            }
        } catch (err) {
            setError(err.message);
        } finally {
            if (!auth.currentUser) {
                setLoading(false);
            }
        }
    };

    return (
        <div className="flex items-center justify-center min-h-screen bg-slate-900">
            <div className="w-full max-w-md p-8 space-y-6 bg-slate-800 rounded-xl shadow-2xl">
                <div className="text-center">
                    <h2 className="text-3xl font-bold text-white">{isLogin ? 'Iniciar Sesión' : 'Crear Cuenta'}</h2>
                    <p className="text-slate-400 mt-2">Bienvenido al sistema de caja</p>
                </div>
                {error && <p className="text-red-400 bg-red-500/10 p-3 rounded-lg text-center border border-red-500/30">{error}</p>}
                <form onSubmit={handleSubmit} className="space-y-6">
                    {!isLogin && (
                        <div>
                            <label className="block mb-2 text-sm font-medium text-slate-300">Nombre</label>
                            <input type="text" value={nombre} onChange={e => setNombre(e.target.value)} required className="w-full p-3 bg-slate-700 border border-slate-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"/>
                        </div>
                    )}
                    <div>
                        <label className="block mb-2 text-sm font-medium text-slate-300">Email</label>
                        <input type="email" value={email} onChange={e => setEmail(e.target.value)} required className="w-full p-3 bg-slate-700 border border-slate-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"/>
                    </div>
                    <div>
                        <label className="block mb-2 text-sm font-medium text-slate-300">Contraseña</label>
                        <input type="password" value={password} onChange={e => setPassword(e.target.value)} required className="w-full p-3 bg-slate-700 border border-slate-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"/>
                    </div>
                    <button type="submit" disabled={loading} className="w-full py-3 px-5 text-white bg-blue-600 hover:bg-blue-700 rounded-lg font-semibold transition duration-300 disabled:bg-blue-800 disabled:cursor-not-allowed shadow-lg hover:shadow-blue-600/40">
                        {loading ? 'Verificando...' : (isLogin ? 'Entrar' : 'Crear Cuenta')}
                    </button>
                </form>
                <p className="text-sm text-center text-slate-400">
                    {isLogin ? '¿No tienes cuenta?' : '¿Ya tienes una cuenta?'}
                    <button onClick={() => setIsLogin(!isLogin)} className="ml-2 font-medium text-blue-400 hover:underline">
                        {isLogin ? 'Regístrate' : 'Inicia Sesión'}
                    </button>
                </p>
            </div>
        </div>
    );
};

const CierreCajaForm = ({ db, user, setView, reportToEdit }) => {
    const [report, setReport] = useState(reportToEdit ? {
        ...reportToEdit,
        creadoPorNombre: reportToEdit.creadoPorNombre || user.nombre,
    } : {
        ...initialReportState,
        creadoPorNombre: user.nombre,
    });
    const [isSubmitting, setIsSubmitting] = useState(false);

    const efectivoReal = useMemo(() => DENOMINATIONS.billetes.reduce((acc, val) => acc + (report.denominaciones[`billete${val}`] || 0) * val, 0) + DENOMINATIONS.monedas.reduce((acc, val) => acc + (report.denominaciones[`moneda${val}`] || 0) * val, 0), [report.denominaciones]);
    const totalTeorico = useMemo(() => Object.values(report.montos).slice(0, 5).reduce((acc, val) => acc + Number(val || 0), 0), [report.montos]);
    const totalReal = useMemo(() => efectivoReal + Object.values(report.montos).slice(5).reduce((acc, val) => acc + Number(val || 0), 0), [efectivoReal, report.montos]);
    const diferenciaTotal = useMemo(() => totalReal - totalTeorico, [totalReal, totalTeorico]);

    const handleChange = (e, category) => {
        const { name, value } = e.target;
        const parsedValue = value === '' ? 0 : parseInt(value, 10);
        if (isNaN(parsedValue)) return;
        setReport(prev => ({ ...prev, [category]: { ...prev[category], [name]: parsedValue } }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            const reportData = {
                ...report,
                creadoPorId: user.uid,
                creadoPorNombre: user.nombre,
                fechaCierre: serverTimestamp(),
                estado: 'pendiente',
                aprobadoPorId: null,
                aprobadoPorNombre: null,
                fechaAprobacion: null,
                calculos: { efectivoReal, totalTeorico, totalReal, diferenciaTotal }
            };
            const collectionPath = `/artifacts/${appId}/public/data/cierresCaja`;
            if (reportToEdit?.id) {
                await setDoc(doc(db, collectionPath, reportToEdit.id), reportData);
            } else {
                await addDoc(collection(db, collectionPath), reportData);
            }
            setView({ name: 'list' });
        } catch (error) {
            console.error("Error al guardar el reporte: ", error);
        } finally {
            setIsSubmitting(false);
        }
    };
    
    const renderInput = (name, label, category, isCurrency = true) => (
        <div className="flex flex-col">
            <label htmlFor={name} className="text-sm font-medium text-slate-400 mb-1">{label}</label>
            <input type="number" id={name} name={name} value={report[category][name] || ''} onChange={(e) => handleChange(e, category)} className="bg-slate-700/50 border border-slate-600 text-white rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500 focus:outline-none transition" placeholder="0" min="0" />
            {isCurrency && <span className="text-xs text-slate-500 mt-1">{formatCurrency(report[category][name] || 0)}</span>}
        </div>
    );
    
    return (
        <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold text-white">{reportToEdit ? 'Editar Reporte de Cierre' : 'Nuevo Reporte de Cierre'}</h1>
                <button onClick={() => setView({ name: 'list' })} className="flex items-center bg-slate-700 hover:bg-slate-600 text-white font-bold py-2 px-4 rounded-lg transition duration-300">{icons.back} Volver</button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-8">
                <div className="bg-slate-800 p-6 rounded-xl shadow-xl">
                    <h2 className="text-xl font-semibold text-blue-400 mb-4 border-b border-slate-700 pb-3">Información General</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div><label className="text-sm font-medium text-slate-400 mb-1">Nombre de Usuario</label><p className="w-full bg-slate-700/50 text-slate-300 rounded-lg p-3">{user.nombre}</p></div>
                        <div><label className="text-sm font-medium text-slate-400 mb-1">Fecha y Hora de Cierre</label><p className="w-full bg-slate-700/50 text-slate-300 rounded-lg p-3">{new Date().toLocaleString('es-CL')}</p></div>
                    </div>
                </div>
                <div className="bg-slate-800 p-6 rounded-xl shadow-xl">
                    <h2 className="text-xl font-semibold text-blue-400 mb-4 border-b border-slate-700 pb-3">Conteo de Efectivo (Real)</h2>
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6">
                        {DENOMINATIONS.billetes.map(val => <React.Fragment key={`b-${val}`}>{renderInput(`billete${val}`, `Billetes de ${formatCurrency(val)}`, 'denominaciones', false)}</React.Fragment>)}
                        {DENOMINATIONS.monedas.map(val => <React.Fragment key={`m-${val}`}>{renderInput(`moneda${val}`, `Monedas de ${formatCurrency(val)}`, 'denominaciones', false)}</React.Fragment>)}
                    </div>
                    <div className="mt-6 text-right bg-slate-900/50 p-4 rounded-lg">
                        <p className="text-slate-400 text-sm">Total Efectivo Real (Contado):</p>
                        <p className="text-2xl font-bold text-green-400">{formatCurrency(efectivoReal)}</p>
                    </div>
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    <div className="bg-slate-800 p-6 rounded-xl shadow-xl space-y-4">
                        <h2 className="text-xl font-semibold text-blue-400 mb-4 border-b border-slate-700 pb-3">Valores Teóricos (Sistema)</h2>
                        {renderInput('efectivoTeorico', 'Efectivo Teórico', 'montos')}
                        {renderInput('debitoTeorico', 'Débito Teórico', 'montos')}
                        {renderInput('creditoTeorico', 'Crédito Teórico', 'montos')}
                        {renderInput('prepagoTeorico', 'Prepago Teórico', 'montos')}
                        {renderInput('transferenciaTeorica', 'Transferencia Teórica', 'montos')}
                    </div>
                    <div className="bg-slate-800 p-6 rounded-xl shadow-xl space-y-4">
                        <h2 className="text-xl font-semibold text-blue-400 mb-4 border-b border-slate-700 pb-3">Valores Reales (Comprobantes)</h2>
                        <div className="flex flex-col"><label className="text-sm font-medium text-slate-400 mb-1">Efectivo Real (Calculado)</label><p className="w-full bg-slate-900/50 text-green-400 font-bold rounded-lg p-3">{formatCurrency(efectivoReal)}</p></div>
                        {renderInput('debitoReal', 'Débito Real', 'montos')}
                        {renderInput('creditoReal', 'Crédito Real', 'montos')}
                        {renderInput('prepagoReal', 'Prepago Real', 'montos')}
                        {renderInput('transferenciaReal', 'Transferencia Real', 'montos')}
                    </div>
                </div>
                <div className="bg-slate-800 p-6 rounded-xl shadow-xl">
                    <h2 className="text-xl font-semibold text-blue-400 mb-4 border-b border-slate-700 pb-3">Totales y Diferencias</h2>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-center">
                        <div className="bg-slate-900/50 p-4 rounded-lg"><p className="text-slate-400 text-sm">Saldo Total Teórico</p><p className="text-2xl font-bold text-yellow-400">{formatCurrency(totalTeorico)}</p></div>
                        <div className="bg-slate-900/50 p-4 rounded-lg"><p className="text-slate-400 text-sm">Saldo Total Real</p><p className="text-2xl font-bold text-green-400">{formatCurrency(totalReal)}</p></div>
                        <div className="bg-slate-900/50 p-4 rounded-lg"><p className="text-slate-400 text-sm">Diferencia</p><p className={`text-2xl font-bold ${diferenciaTotal < 0 ? 'text-red-500' : 'text-green-400'}`}>{formatCurrency(diferenciaTotal)}</p></div>
                    </div>
                    <div className="mt-6"><label htmlFor="observaciones" className="text-sm font-medium text-slate-400 mb-1">Observaciones</label><textarea id="observaciones" value={report.observaciones} onChange={(e) => setReport(prev => ({...prev, observaciones: e.target.value}))} rows="4" className="w-full bg-slate-700/50 border border-slate-600 text-white rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500 focus:outline-none transition"></textarea></div>
                </div>
                <div className="flex justify-end pt-4"><button type="submit" disabled={isSubmitting} className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-8 rounded-lg transition duration-300 disabled:bg-slate-500 shadow-lg hover:shadow-blue-600/40">{isSubmitting ? 'Guardando...' : 'Guardar Reporte'}</button></div>
            </form>
        </div>
    );
};

const ReportList = ({ db, user, setView }) => {
    const [reports, setReports] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const q = query(collection(db, `/artifacts/${appId}/public/data/cierresCaja`));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            data.sort((a, b) => (b.fechaCierre?.toDate() || 0) - (a.fechaCierre?.toDate() || 0));
            setReports(data);
            setLoading(false);
        }, (error) => {
            console.error("Error fetching reports: ", error);
            setLoading(false);
        });
        return () => unsubscribe();
    }, [db]);

    const handleApprove = async (reportId) => {
        if (!window.confirm("¿Está seguro de que desea aprobar este reporte? Esta acción no se puede deshacer.")) return;
        try {
            const docRef = doc(db, `/artifacts/${appId}/public/data/cierresCaja`, reportId);
            await updateDoc(docRef, { estado: 'aprobado', aprobadoPorId: user.uid, aprobadoPorNombre: user.nombre, fechaAprobacion: serverTimestamp() });
        } catch (error) { console.error("Error al aprobar: ", error); }
    };

    if (loading) return <div className="text-white text-center p-10">Cargando reportes...</div>;

    const canApprove = user.role === 'administrador' || user.role === 'revisor';

    return (
        <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-white flex items-center">{icons.reports} Historial de Cierres de Caja</h1>
                    <p className="text-slate-400 mt-1">Aquí puedes ver, editar y aprobar los reportes.</p>
                </div>
                <button onClick={() => setView({ name: 'form' })} className="flex items-center bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg transition duration-300 shadow-lg hover:shadow-blue-600/40">{icons.add} Nuevo Cierre</button>
            </div>
            <div className="bg-slate-800 rounded-xl shadow-xl overflow-x-auto">
                <table className="w-full text-left text-slate-300">
                    <thead className="bg-slate-900/50 text-xs text-slate-400 uppercase">
                        <tr>
                            <th className="p-4">Fecha Cierre</th>
                            <th className="p-4">Creado por</th>
                            <th className="p-4 text-right">Total Real</th>
                            <th className="p-4 text-right">Diferencia</th>
                            <th className="p-4 text-center">Estado</th>
                            <th className="p-4 text-center">Acciones</th>
                        </tr>
                    </thead>
                    <tbody>
                        {reports.map(r => (
                            <tr key={r.id} className="border-b border-slate-700 hover:bg-slate-700/50 transition-colors">
                                <td className="p-4">{r.fechaCierre ? new Date(r.fechaCierre.toDate()).toLocaleString('es-CL') : 'N/A'}</td>
                                <td className="p-4">{r.creadoPorNombre}</td>
                                <td className="p-4 font-mono text-right">{formatCurrency(r.calculos?.totalReal || 0)}</td>
                                <td className={`p-4 font-mono text-right ${r.calculos?.diferenciaTotal < 0 ? 'text-red-400' : 'text-green-400'}`}>{formatCurrency(r.calculos?.diferenciaTotal || 0)}</td>
                                <td className="p-4 text-center">
                                    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${r.estado === 'aprobado' ? 'bg-green-500/10 text-green-300 border border-green-500/20' : 'bg-yellow-500/10 text-yellow-300 border border-yellow-500/20'}`}>
                                        {r.estado}
                                    </span>
                                </td>
                                <td className="p-4 space-x-2 text-center">
                                    <button onClick={() => setView({ name: 'detail', reportId: r.id })} className="font-semibold text-blue-400 hover:text-blue-300">Ver</button>
                                    {r.estado === 'pendiente' && canApprove && r.creadoPorId !== user.uid && <button onClick={() => handleApprove(r.id)} className="font-semibold text-green-400 hover:text-green-300">Aprobar</button>}
                                    {r.estado === 'pendiente' && r.creadoPorId === user.uid && <button onClick={() => setView({ name: 'form', reportToEdit: r })} className="font-semibold text-yellow-400 hover:text-yellow-300">Editar</button>}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                {reports.length === 0 && <p className="text-center p-8 text-slate-500">No se han encontrado reportes.</p>}
            </div>
        </div>
    );
};

const ReportDetail = ({ db, setView, reportId }) => {
    const [report, setReport] = useState(null);
    useEffect(() => {
        const unsub = onSnapshot(doc(db, `/artifacts/${appId}/public/data/cierresCaja`, reportId), (doc) => {
            setReport(doc.exists() ? { id: doc.id, ...doc.data() } : null);
        }, (error) => {
            console.error("Error fetching report detail: ", error);
        });
        return unsub;
    }, [db, reportId]);

    if (!report) return <div className="text-white p-10 text-center">Cargando...</div>;
    const { creadoPorNombre, fechaCierre, calculos, estado, aprobadoPorNombre, fechaAprobacion } = report;
    return (
        <div className="p-4 sm:p-6 lg:p-8 max-w-4xl mx-auto">
            <div className="flex justify-between items-center mb-6">
                 <h1 className="text-2xl font-bold text-white">Detalle de Reporte</h1>
                 <div>
                    <button onClick={() => window.print()} className="flex items-center bg-teal-600 hover:bg-teal-500 text-white font-bold py-2 px-4 rounded-lg transition mr-2">{icons.print} Imprimir</button>
                    <button onClick={() => setView({ name: 'list' })} className="flex items-center bg-slate-700 hover:bg-slate-600 text-white font-bold py-2 px-4 rounded-lg">{icons.back} Volver</button>
                 </div>
            </div>
            <div className="bg-white text-slate-800 p-8 rounded-xl shadow-2xl printable-area">
                 <div className="text-center border-b pb-4 mb-6 border-slate-200">
                    <h2 className="text-3xl font-bold text-slate-900">Reporte de Cierre de Caja</h2>
                    <p className="text-slate-500">Fecha: {fechaCierre ? new Date(fechaCierre.toDate()).toLocaleString('es-CL') : 'N/A'}</p>
                </div>
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-6">
                    <div className="space-y-2">
                        <h3 className="font-bold text-lg mb-2 text-slate-600 border-b pb-2">Información del Cierre</h3>
                        <p><strong className="font-semibold text-slate-500">Realizado por:</strong> {creadoPorNombre}</p>
                        <p><strong className="font-semibold text-slate-500">Estado:</strong> <span className={`font-bold ${estado === 'aprobado' ? 'text-green-600' : 'text-yellow-600'}`}>{estado}</span></p>
                        {estado === 'aprobado' && (<><p><strong className="font-semibold text-slate-500">Aprobado por:</strong> {aprobadoPorNombre}</p><p><strong className="font-semibold text-slate-500">Fecha Aprobación:</strong> {fechaAprobacion ? new Date(fechaAprobacion.toDate()).toLocaleString('es-CL') : 'N/A'}</p></>)}
                    </div>
                     <div className="bg-slate-100 p-4 rounded-lg text-center flex flex-col justify-center">
                        <h3 className="font-bold text-lg mb-2 text-slate-600">Diferencia Total</h3>
                         <p className={`text-4xl font-bold ${calculos.diferenciaTotal < 0 ? 'text-red-600' : 'text-green-700'}`}>{formatCurrency(calculos.diferenciaTotal)}</p>
                    </div>
                </div>
            </div>
        </div>
    );
};

const AdminPanel = ({ db }) => {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);

    const fetchUsers = async () => {
        setLoading(true);
        try {
            const usersCollection = collection(db, 'users');
            const userSnapshot = await getDocs(usersCollection);
            const userList = userSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setUsers(userList);
        } catch (error) {
            console.error("Error fetching users: ", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchUsers();
    }, [db]);

    const handleRoleChange = async (userId, newRole) => {
        const userDoc = doc(db, 'users', userId);
        await updateDoc(userDoc, { role: newRole });
        fetchUsers();
    };

    if (loading) return <div className="text-white text-center p-10">Cargando usuarios...</div>;

    return (
        <div className="p-4 sm:p-6 lg:p-8 max-w-4xl mx-auto">
            <h1 className="text-2xl font-bold text-white mb-6 flex items-center">{icons.admin} Panel de Administración</h1>
            <div className="bg-slate-800 rounded-xl shadow-xl overflow-x-auto">
                <table className="w-full text-left text-slate-300">
                    <thead className="bg-slate-900/50 text-xs text-slate-400 uppercase">
                        <tr><th className="p-4">Nombre</th><th className="p-4">Email</th><th className="p-4">Rol</th></tr>
                    </thead>
                    <tbody>
                        {users.map(user => (
                            <tr key={user.id} className="border-b border-slate-700">
                                <td className="p-4">{user.nombre}</td>
                                <td className="p-4">{user.email}</td>
                                <td className="p-4">
                                    <select value={user.role} onChange={(e) => handleRoleChange(user.id, e.target.value)} className="bg-slate-700 border border-slate-600 rounded-lg p-2 text-white focus:ring-2 focus:ring-blue-500">
                                        <option value="usuario">Usuario</option>
                                        <option value="revisor">Revisor</option>
                                        <option value="administrador">Administrador</option>
                                    </select>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

// --- COMPONENTE PRINCIPAL ---
export default function App() {
    const [auth, setAuth] = useState(null);
    const [db, setDb] = useState(null);
    const [user, setUser] = useState(null);
    const [userData, setUserData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [view, setView] = useState({ name: 'list' });

    useEffect(() => {
        if (!firebaseConfig.apiKey || firebaseConfig.apiKey === "TU_API_KEY") {
            console.error("Firebase config is empty or a placeholder. Please add your configuration.");
            setLoading(false);
            return;
        }
        const app = initializeApp(firebaseConfig);
        const authInstance = getAuth(app);
        const dbInstance = getFirestore(app);
        setAuth(authInstance);
        setDb(dbInstance);

        const unsubscribe = onAuthStateChanged(authInstance, async (user) => {
            try {
                if (user) {
                    setUser(user);
                    const userDocRef = doc(dbInstance, "users", user.uid);
                    const userDoc = await getDoc(userDocRef);
                    if (userDoc.exists()) {
                        setUserData({ uid: user.uid, ...userDoc.data() });
                    } else {
                        const newUserData = {
                            uid: user.uid,
                            email: user.email,
                            nombre: user.displayName || user.email.split('@')[0],
                            role: 'usuario'
                        };
                        await setDoc(userDocRef, newUserData);
                        setUserData(newUserData);
                    }
                } else {
                    setUser(null);
                    setUserData(null);
                }
            } catch (error) {
                console.error("Error during auth state change processing:", error);
                setUser(null);
                setUserData(null);
            } finally {
                setLoading(false);
            }
        });

        return () => unsubscribe();
    }, []);

    const handleLogout = async () => {
        if (auth) {
            await signOut(auth);
            setView({ name: 'list' });
        }
    };

    if (loading) {
        return <div className="bg-slate-900 text-white min-h-screen flex items-center justify-center"><h1>Cargando...</h1></div>;
    }

    if (!firebaseConfig.apiKey || firebaseConfig.apiKey === "TU_API_KEY") {
        return <div className="bg-red-800 text-white min-h-screen flex items-center justify-center p-8 text-center"><div className="max-w-md"><h1 className="text-2xl font-bold mb-2">Error de Configuración</h1><p className="text-red-200">La configuración de Firebase no ha sido añadida al código. Por favor, sigue las instrucciones de la guía de despliegue para configurar tu `firebaseConfig`.</p></div></div>;
    }

    if (!user || !userData) {
        return <LoginScreen auth={auth} db={db} />;
    }

    const renderContent = () => {
        switch (view.name) {
            case 'form': return <CierreCajaForm db={db} user={userData} setView={setView} reportToEdit={view.reportToEdit} />;
            case 'detail': return <ReportDetail db={db} setView={setView} reportId={view.reportId} />;
            case 'admin': return userData.role === 'administrador' ? <AdminPanel db={db} /> : <div className="p-8 text-red-400">Acceso denegado.</div>;
            case 'list':
            default: return <ReportList db={db} user={userData} setView={setView} />;
        }
    };

    return (
        <div className="bg-slate-900 text-white min-h-screen font-sans">
            <header className="bg-slate-800/50 backdrop-blur-lg shadow-lg sticky top-0 z-50">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between items-center py-3">
                        <div className="flex items-center">
                            {icons.cash}
                            <h1 className="text-xl font-semibold">Sistema de Caja</h1>
                        </div>
                        <div className="flex items-center space-x-4">
                            {userData.role === 'administrador' && <button onClick={() => setView({name: 'admin'})} className="text-slate-300 hover:text-white transition">Admin</button>}
                            <button onClick={() => setView({name: 'list'})} className="text-slate-300 hover:text-white transition">Reportes</button>
                            <div className="text-right">
                                <p className="font-semibold text-sm">{userData.nombre}</p>
                                <p className="text-xs text-slate-400 capitalize">{userData.role}</p>
                            </div>
                            <button onClick={handleLogout} title="Cerrar Sesión" className="flex items-center bg-red-600 hover:bg-red-700 text-white font-bold p-2 rounded-full transition duration-300 shadow-lg hover:shadow-red-600/40">{icons.logout}</button>
                        </div>
                    </div>
                </div>
            </header>
            <main>
                {renderContent()}
            </main>
        </div>
    );
}
