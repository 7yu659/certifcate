import React, { useState, useRef, useEffect } from 'react';
import Draggable from 'react-draggable';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import { Download, Save, Upload, Image as ImageIcon, List, Trash2, Edit2, X, Printer } from 'lucide-react';
import { collection, addDoc, getDocs, deleteDoc, doc, query, orderBy } from 'firebase/firestore';
import { db } from './firebase';

interface CertificateData {
  id: string;
  studentName: string;
  fatherName: string;
  motherName: string;
  dob: string;
  thana: string;
  district: string;
  durationStart: string;
  durationEnd: string;
  backgroundImage: string | null;
  positions: Record<string, { x: number; y: number }>;
  timestamp: number;
}

const defaultPositions = {
  studentName: { x: 340, y: 355 },    // Centered on the first line
  dob: { x: 640, y: 355 },            // Same exact line
  fatherName: { x: 120, y: 400 },     // Second line, nudged right of label
  motherName: { x: 440, y: 400 },     // Second line
  thana: { x: 650, y: 400 },          // Shifted left 40px so it's not cropped
  district: { x: 120, y: 445 },       // Third line, nudged right
  durationStart: { x: 200, y: 525 },  // Fourth line, moved right so it doesn't overlap text
  durationEnd: { x: 480, y: 525 },    // Fourth line, cleared from wording
};

const locationData: Record<string, string[]> = {
  "যশোর": ["অভয়নগর", "যশোর সদর", "চৌগাছা", "ঝিকরগাছা", "বাঘারপাড়া", "মনিরামপুর", "শার্শা", "কেশবপুর"],
  "ঢাকা": ["ধানমন্ডি", "মিরপুর", "মোহাম্মদপুর", "গুলশান", "উত্তরা", "রমনা", "মতিঝিল", "তেজগাঁও"],
  "খুলনা": ["খুলনা সদর", "ডুমুরিয়া", "কয়রা", "বটিয়াঘাটা", "রূপসা", "তেরখাদা", "ফুলতলা", "দাকোপ"],
  "চট্টগ্রাম": ["কোতোয়ালী", "পাহাড়তলী", "বন্দর", "ডবলমুরিং", "হালিশহর"],
  "রাজশাহী": ["বোয়ালিয়া", "রাজপাড়া", "মতিহার", "শাহ মখদুম"],
  "সিলেট": ["সিলেট সদর", "দক্ষিণ সুরমা", "গোলাপগঞ্জ", "বালাগঞ্জ"]
};

const standardizeDateForInput = (dateStr: string) => {
  if (!dateStr) return '';
  if (dateStr.includes('/')) {
      const parts = dateStr.split('/');
      if (parts.length === 3 && parts[2].length === 4) {
          return `${parts[2]}-${parts[1]}-${parts[0]}`;
      }
  }
  return dateStr;
};

const convertToBengaliDate = (dateStr: string) => {
  if (!dateStr) return '';
  const bngDigits = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];
  let formattedStr = dateStr;
  if (dateStr.includes('-') && dateStr.split('-').length === 3) {
    const [year, month, day] = dateStr.split('-');
    formattedStr = `${day}-${month}-${year} ইং`;
  }
  return formattedStr.replace(/[0-9]/g, (d) => bngDigits[parseInt(d)]);
};

function App() {
  const [formData, setFormData] = useState({
    studentName: 'খালিদ হাসান',
    fatherName: 'তারিক হাসান',
    motherName: 'ফাতেমা বেগম',
    dob: '2005-01-01',
    district: 'যশোর',
    thana: 'অভয়নগর',
    durationStart: '2020-01-01',
    durationEnd: '2025-12-31'
  });
  
  const [backgroundImage, setBackgroundImage] = useState<string | null>(null);
  const [positions, setPositions] = useState<Record<string, { x: number; y: number }>>(defaultPositions);
  const [savedCertificates, setSavedCertificates] = useState<CertificateData[]>([]);
  const [showSavedQueue, setShowSavedQueue] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const certificateRef = useRef<HTMLDivElement>(null);
  
  const nodeRefs = {
    studentName: useRef<HTMLDivElement>(null),
    dob: useRef<HTMLDivElement>(null),
    fatherName: useRef<HTMLDivElement>(null),
    motherName: useRef<HTMLDivElement>(null),
    district: useRef<HTMLDivElement>(null),
    thana: useRef<HTMLDivElement>(null),
    durationStart: useRef<HTMLDivElement>(null),
    durationEnd: useRef<HTMLDivElement>(null),
  };

  useEffect(() => {
    const fetchCerts = async () => {
      try {
        const q = query(collection(db, 'certificates'), orderBy('timestamp', 'desc'));
        const qs = await getDocs(q);
        const data = qs.docs.map(doc => ({ id: doc.id, ...doc.data() })) as CertificateData[];
        setSavedCertificates(data);
        localStorage.setItem('savedCertificates', JSON.stringify(data));
      } catch (error) {
        console.error("Error fetching certificates from Firebase (might be permissions):", error);
        const saved = localStorage.getItem('savedCertificates');
        if (saved) {
          setSavedCertificates(JSON.parse(saved));
        }
      }
    };
    fetchCerts();
  }, []);

  const saveToHistory = async () => {
    if (!backgroundImage) {
      alert("অনুগ্রহ করে একটি সার্টিফিকেট ব্যাকগ্রাউন্ড আপলোড করুন (Please upload a background image).");
      return;
    }
    
    setIsSaving(true);
    const certDetails = {
      ...formData,
      backgroundImage,
      positions,
      timestamp: Date.now(),
    };

    try {
      const docRef = await addDoc(collection(db, 'certificates'), certDetails);
      const newCert: CertificateData = { id: docRef.id, ...certDetails };
      
      const updated = [newCert, ...savedCertificates];
      setSavedCertificates(updated);
      localStorage.setItem('savedCertificates', JSON.stringify(updated));
      alert("সাফল্যের সাথে ডাটাবেজে সংরক্ষিত হয়েছে! (Saved successfully to Database!)");
    } catch (error) {
       console.error("Error saving document to Firebase:", error);
       const newCert: CertificateData = { id: Date.now().toString(), ...certDetails };
       const updated = [newCert, ...savedCertificates];
       setSavedCertificates(updated);
       localStorage.setItem('savedCertificates', JSON.stringify(updated));
       alert("ডাটাবেজ এক্সেস না থাকায় লোকাল স্টোরেজে সেভ করা হয়েছে। (Saved locally due to DB error. Check Firebase rules.)");
    } finally {
       setIsSaving(false);
    }
  };

  const loadCertificate = (cert: CertificateData) => {
    setFormData({
      studentName: cert.studentName,
      fatherName: cert.fatherName,
      motherName: cert.motherName,
      dob: standardizeDateForInput(cert.dob),
      district: cert.district,
      thana: cert.thana,
      durationStart: standardizeDateForInput(cert.durationStart),
      durationEnd: standardizeDateForInput(cert.durationEnd)
    });
    setBackgroundImage(cert.backgroundImage);
    setPositions(cert.positions || defaultPositions);
    setShowSavedQueue(false);
  };

  const handleDeleteCertificate = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'certificates', id));
    } catch (err) {
      console.error("Error deleting document from DB:", err);
    }
    // Always delete locally to keep UI consistent
    const updated = savedCertificates.filter(c => c.id !== id);
    setSavedCertificates(updated);
    localStorage.setItem('savedCertificates', JSON.stringify(updated));
  };

  const handleDownloadPDF = async (overrideName?: string) => {
    if (!certificateRef.current || !backgroundImage) {
        alert("সার্টিফিকেট ব্যাকগ্রাউন্ড প্রয়োজন (Certificate background required)");
        return;
    }

    try {
      const element = certificateRef.current;
      const canvas = await html2canvas(element, { 
        scale: 2,
        useCORS: true,
        allowTaint: true,
      });
      const imgData = canvas.toDataURL('image/png');
      
      const pdf = new jsPDF({
        orientation: canvas.width > canvas.height ? 'landscape' : 'portrait',
        unit: 'px',
        format: [canvas.width, canvas.height]
      });
      
      pdf.addImage(imgData, 'PNG', 0, 0, canvas.width, canvas.height);
      const name = typeof overrideName === 'string' ? overrideName : formData.studentName;
      const filename = name ? `${name}_Certificate.pdf` : 'Certificate.pdf';
      pdf.save(filename);
    } catch (error) {
      console.error("Error generating PDF", error);
      alert("PDF তৈরি করতে সমস্যা হয়েছে (Error generating PDF)");
    }
  };

  const handlePrint = async () => {
    if (!certificateRef.current || !backgroundImage) {
        alert("সার্টিফিকেট ব্যাকগ্রাউন্ড প্রয়োজন (Certificate background required)");
        return;
    }

    try {
      const element = certificateRef.current;
      const canvas = await html2canvas(element, { 
        scale: 2,
        useCORS: true,
        allowTaint: true,
      });
      const imgData = canvas.toDataURL('image/png');
      
      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.write(`
          <html>
            <head>
              <title>Print Certificate</title>
              <style>
                body { margin: 0; display: flex; justify-content: center; align-items: center; min-height: 100vh; background-color: #f3f4f6; }
                img { max-width: 100%; height: auto; box-shadow: 0 10px 25px rgba(0,0,0,0.1); }
                @media print {
                  body { background-color: white; }
                  img { box-shadow: none; max-width: 100%; height: auto; }
                  @page { margin: 0; size: landscape; }
                }
              </style>
            </head>
            <body>
              <img src="${imgData}" />
              <script>
                window.onload = () => {
                  setTimeout(() => {
                    window.print();
                    window.close();
                  }, 500);
                };
              </script>
            </body>
          </html>
        `);
        printWindow.document.close();
      }
    } catch (error) {
      console.error("Error generating Print", error);
      alert("প্রিন্ট তৈরি করতে সমস্যা হয়েছে (Error generating Print)");
    }
  };

  const downloadFromHistory = (cert: CertificateData) => {
    loadCertificate(cert);
    setTimeout(() => {
        handleDownloadPDF(cert.studentName);
    }, 800);
  };

  const handleDrag = (field: string, _e: any, data: { x: number; y: number }) => {
    setPositions(prev => ({
      ...prev,
      [field]: { x: data.x, y: data.y }
    }));
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>, setter: React.Dispatch<React.SetStateAction<string | null>>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new window.Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const maxDim = 1200;
          let width = img.width;
          let height = img.height;
          if (width > maxDim || height > maxDim) {
            if (width > height) {
              height = Math.round((height * maxDim) / width);
              width = maxDim;
            } else {
              width = Math.round((width * maxDim) / height);
              height = maxDim;
            }
          }
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(img, 0, 0, width, height);
            setter(canvas.toDataURL('image/jpeg', 0.6));
          } else {
            setter(event.target?.result as string);
          }
        };
        img.src = event.target?.result as string;
      };
      reader.readAsDataURL(file);
    }
  };

  const availableThanas = locationData[formData.district] || [];

  // Update thana if district changes and current thana not in new district
  const handleDistrictChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
      const newDist = e.target.value;
      const newThanas = locationData[newDist] || [];
      const newThana = newThanas.includes(formData.thana) ? formData.thana : (newThanas[0] || '');
      setFormData({ ...formData, district: newDist, thana: newThana });
  };

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col md:flex-row font-sans">
      {/* Sidebar Form */}
      <div className="w-full md:w-1/3 lg:w-1/4 bg-white shadow-xl p-6 overflow-y-auto z-10 flex flex-col border-r h-screen">
        <h2 className="text-2xl font-bold text-gray-800 mb-6 border-b pb-4 flex items-center justify-between">
          <span>Certificate Data</span>
          <button 
            onClick={() => setShowSavedQueue(true)}
            className="p-2 text-blue-600 hover:bg-blue-50 rounded-full transition-colors"
            title="Saved Certificates"
          >
            <List size={22} />
          </button>
        </h2>

        <div className="space-y-4 flex-grow">
          {/* Background Upload */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Background Image (ব্যাকগ্রাউন্ড)</label>
            <div className="flex items-center justify-center w-full">
                <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100 transition-colors">
                    <div className="flex flex-col items-center justify-center pt-5 pb-6">
                        <Upload className="w-8 h-8 mb-3 text-gray-400" />
                        <p className="mb-2 text-sm text-gray-500"><span className="font-semibold">Click to upload</span> background</p>
                    </div>
                    <input type="file" className="hidden" accept="image/*" onChange={(e) => handleImageUpload(e, setBackgroundImage)} />
                </label>
            </div>
          </div>

          <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Name (শিক্ষার্থীর নাম)</label>
                    <input 
                      type="text" 
                      value={formData.studentName}
                      onChange={e => setFormData({...formData, studentName: e.target.value})}
                      className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Date of Birth (জন্ম তারিখ)</label>
                    <input 
                      type="date" 
                      value={formData.dob}
                      onChange={e => setFormData({...formData, dob: e.target.value})}
                      className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    />
                  </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Father's Name (পিতার নাম)</label>
                    <input 
                      type="text" 
                      value={formData.fatherName}
                      onChange={e => setFormData({...formData, fatherName: e.target.value})}
                      className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Mother's Name (মাতার নাম)</label>
                    <input 
                      type="text" 
                      value={formData.motherName}
                      onChange={e => setFormData({...formData, motherName: e.target.value})}
                      className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    />
                  </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">District (জেলা)</label>
                    <select 
                      value={formData.district}
                      onChange={handleDistrictChange}
                      className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white"
                    >
                      {Object.keys(locationData).map(dist => (
                        <option key={dist} value={dist}>{dist}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Thana (থানা)</label>
                    <select 
                      value={formData.thana}
                      onChange={e => setFormData({...formData, thana: e.target.value})}
                      className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white"
                    >
                      {availableThanas.map(thana => (
                        <option key={thana} value={thana}>{thana}</option>
                      ))}
                    </select>
                  </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Duration Start (মেয়াদকাল শুরু)</label>
                    <input 
                      type="date" 
                      value={formData.durationStart}
                      onChange={e => setFormData({...formData, durationStart: e.target.value})}
                      className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Duration End (মেয়াদকাল শেষ)</label>
                    <input 
                      type="date" 
                      value={formData.durationEnd}
                      onChange={e => setFormData({...formData, durationEnd: e.target.value})}
                      className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    />
                  </div>
              </div>
          </div>
        </div>

        <div className="mt-8 space-y-3 pt-4 border-t">
          <button 
            onClick={saveToHistory}
            disabled={isSaving}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2.5 px-4 rounded-lg flex items-center justify-center transition-colors shadow-sm disabled:opacity-50"
          >
            <Save className="w-5 h-5 mr-2" />
            {isSaving ? "Saving..." : "Save to History"}
          </button>
          
          <div className="grid grid-cols-2 gap-3">
            <button 
              onClick={() => handleDownloadPDF()}
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-medium py-2.5 px-4 rounded-lg flex items-center justify-center transition-colors shadow-sm"
            >
              <Download className="w-5 h-5 mr-2" />
              PDF
            </button>

            <button 
              onClick={handlePrint}
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2.5 px-4 rounded-lg flex items-center justify-center transition-colors shadow-sm"
            >
              <Printer className="w-5 h-5 mr-2" />
              Print
            </button>
          </div>
        </div>
      </div>

      {/* Main Preview Area */}
      <div className="flex-1 overflow-auto bg-gray-200 p-8 flex items-center justify-center min-h-screen">
        <div className="max-w-full relative shadow-2xl bg-white select-none overflow-hidden" 
             style={{ width: '800px', height: '600px', border: backgroundImage ? 'none' : '2px dashed #9ca3af' }}>
          
          {/* Certificate Container to capture */}
          <div ref={certificateRef} className="w-full h-full relative" style={{ width: '800px', height: '600px' }}>
            {backgroundImage ? (
              <img src={backgroundImage} alt="Certificate Background" className="w-full h-full object-cover pointer-events-none" crossOrigin="anonymous"/>
            ) : (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-400 p-8 text-center">
                    <ImageIcon className="w-16 h-16 mb-4 opacity-50" />
                    <h3 className="text-xl font-medium mb-2">No Background Image</h3>
                    <p>Upload a certificate background from the sidebar to start creating.</p>
                </div>
            )}
            
            {/* Draggable Fields */}
            {backgroundImage && (
              <>
                <Draggable nodeRef={nodeRefs.studentName} position={positions.studentName} onDrag={(e, data) => handleDrag('studentName', e, data)} bounds="parent">
                  <div ref={nodeRefs.studentName} className="cert-text absolute top-0 left-0 cursor-move px-2 py-1 hover:border-2 border-dashed border-blue-500 rounded text-xl font-semibold text-gray-900 whitespace-nowrap z-10">
                    {formData.studentName}
                  </div>
                </Draggable>

                <Draggable nodeRef={nodeRefs.dob} position={positions.dob} onDrag={(e, data) => handleDrag('dob', e, data)} bounds="parent">
                  <div ref={nodeRefs.dob} className="cert-text absolute top-0 left-0 cursor-move px-2 py-1 hover:border-2 border-dashed border-blue-500 rounded text-lg font-medium text-gray-900 whitespace-nowrap z-10">
                    {convertToBengaliDate(formData.dob)}
                  </div>
                </Draggable>

                <Draggable nodeRef={nodeRefs.fatherName} position={positions.fatherName} onDrag={(e, data) => handleDrag('fatherName', e, data)} bounds="parent">
                  <div ref={nodeRefs.fatherName} className="cert-text absolute top-0 left-0 cursor-move px-2 py-1 hover:border-2 border-dashed border-blue-500 rounded text-lg font-medium text-gray-900 whitespace-nowrap z-10">
                    {formData.fatherName}
                  </div>
                </Draggable>

                <Draggable nodeRef={nodeRefs.motherName} position={positions.motherName} onDrag={(e, data) => handleDrag('motherName', e, data)} bounds="parent">
                  <div ref={nodeRefs.motherName} className="cert-text absolute top-0 left-0 cursor-move px-2 py-1 hover:border-2 border-dashed border-blue-500 rounded text-lg font-medium text-gray-900 whitespace-nowrap z-10">
                    {formData.motherName}
                  </div>
                </Draggable>

                <Draggable nodeRef={nodeRefs.thana} position={positions.thana} onDrag={(e, data) => handleDrag('thana', e, data)} bounds="parent">
                  <div ref={nodeRefs.thana} className="cert-text absolute top-0 left-0 cursor-move px-2 py-1 hover:border-2 border-dashed border-blue-500 rounded text-lg font-medium text-gray-900 whitespace-nowrap z-10">
                    {formData.thana}
                  </div>
                </Draggable>

                <Draggable nodeRef={nodeRefs.district} position={positions.district} onDrag={(e, data) => handleDrag('district', e, data)} bounds="parent">
                  <div ref={nodeRefs.district} className="cert-text absolute top-0 left-0 cursor-move px-2 py-1 hover:border-2 border-dashed border-blue-500 rounded text-lg font-medium text-gray-900 whitespace-nowrap z-10">
                    {formData.district}
                  </div>
                </Draggable>

                <Draggable nodeRef={nodeRefs.durationStart} position={positions.durationStart} onDrag={(e, data) => handleDrag('durationStart', e, data)} bounds="parent">
                  <div ref={nodeRefs.durationStart} className="cert-text absolute top-0 left-0 cursor-move px-2 py-1 hover:border-2 border-dashed border-blue-500 rounded text-lg font-medium text-gray-900 whitespace-nowrap z-10">
                    {convertToBengaliDate(formData.durationStart)}
                  </div>
                </Draggable>

                <Draggable nodeRef={nodeRefs.durationEnd} position={positions.durationEnd} onDrag={(e, data) => handleDrag('durationEnd', e, data)} bounds="parent">
                  <div ref={nodeRefs.durationEnd} className="cert-text absolute top-0 left-0 cursor-move px-2 py-1 hover:border-2 border-dashed border-blue-500 rounded text-lg font-medium text-gray-900 whitespace-nowrap z-10">
                    {convertToBengaliDate(formData.durationEnd)}
                  </div>
                </Draggable>
              </>
            )}
          </div>
          
          {backgroundImage && (
            <div className="absolute top-2 right-2 bg-black bg-opacity-60 text-white text-xs px-2 py-1 rounded backdrop-blur-sm shadow pointer-events-none z-50">
                Drag text & photo to reposition
            </div>
          )}
        </div>
      </div>

      {/* Saved Certificates Modal */}
      {showSavedQueue && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[80vh] flex flex-col">
            <div className="flex justify-between items-center p-6 border-b">
              <h2 className="text-xl font-bold text-gray-800">Saved Certificates</h2>
              <button onClick={() => setShowSavedQueue(false)} className="text-gray-500 hover:text-gray-700 p-1">
                <X size={24} />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto flex-1">
              {savedCertificates.length === 0 ? (
                <div className="text-center py-10 text-gray-500">
                  <Save className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                  <p>No saved certificates yet.</p>
                </div>
              ) : (
                <div className="grid gap-4">
                  {savedCertificates.map(cert => (
                    <div key={cert.id} className="border rounded-lg p-4 flex flex-col sm:flex-row gap-4 items-center bg-gray-50 hover:bg-white transition-colors shadow-sm">
                      <div className="w-32 h-20 bg-gray-200 rounded overflow-hidden flex-shrink-0 border">
                        {cert.backgroundImage && (
                          <img src={cert.backgroundImage} alt="Preview" className="w-full h-full object-cover" />
                        )}
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold text-lg text-gray-800">{cert.studentName}</h3>
                        <p className="text-sm text-gray-600 flex gap-4 mt-1">
                          <span>{cert.fatherName}</span>
                          <span>•</span>
                          <span>{cert.district}</span>
                        </p>
                        <p className="text-xs text-gray-400 mt-2">
                          {new Date(cert.timestamp).toLocaleString()}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <button 
                          onClick={() => downloadFromHistory(cert)}
                          className="px-3 py-1.5 bg-emerald-100 text-emerald-700 hover:bg-emerald-200 rounded-md font-medium text-sm flex items-center transition-colors"
                          title="Load and Download"
                        >
                          <Download size={16} className="mr-1.5" />
                          Download
                        </button>
                        <button 
                          onClick={() => loadCertificate(cert)}
                          className="px-3 py-1.5 bg-blue-100 text-blue-700 hover:bg-blue-200 rounded-md font-medium text-sm flex items-center transition-colors"
                          title="Load for editing"
                        >
                          <Edit2 size={16} className="mr-1.5" />
                          Load
                        </button>
                        <button 
                          onClick={() => handleDeleteCertificate(cert.id)}
                          className="p-1.5 text-red-500 hover:bg-red-50 rounded-md transition-colors"
                          title="Delete"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
