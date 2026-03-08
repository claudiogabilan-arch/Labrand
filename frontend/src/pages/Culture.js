import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useBrand } from '../contexts/BrandContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Progress } from '../components/ui/progress';
import { Input } from '../components/ui/input';
import { Textarea } from '../components/ui/textarea';
import { toast } from 'sonner';
import { Users, CheckCircle2, Loader2, Save, ChevronDown, Heart, BookOpen, Shield, Sparkles } from 'lucide-react';
import axios from 'axios';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const SECTION_ICONS = {
  manifesto: BookOpen,
  rituals: Sparkles,
  behaviors: Shield,
  employee_experience: Users,
  alignment: Heart
};

function TagInput({ value = [], onChange, placeholder }) {
  const [input, setInput] = useState('');
  const addTag = () => {
    const tag = input.trim();
    if (tag && !value.includes(tag)) {
      onChange([...value, tag]);
      setInput('');
    }
  };
  return (
    <div>
      <div className="flex flex-wrap gap-1.5 mb-2">
        {value.map((tag, i) => (
          <Badge key={i} variant="secondary" className="gap-1 cursor-pointer" onClick={() => onChange(value.filter((_, j) => j !== i))}>
            {tag} <span className="text-xs opacity-60">x</span>
          </Badge>
        ))}
      </div>
      <Input
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addTag(); } }}
        placeholder={placeholder || "Digite e pressione Enter"}
        className="text-sm"
      />
    </div>
  );
}

function SectionCard({ section, onSave }) {
  const [expanded, setExpanded] = useState(section.completed);
  const [data, setData] = useState(section.data || {});
  const [saving, setSaving] = useState(false);
  const Icon = SECTION_ICONS[section.id] || Users;

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave(section.id, data);
    } finally {
      setSaving(false);
    }
  };

  const updateField = (key, val) => setData(prev => ({ ...prev, [key]: val }));

  return (
    <Card className={section.completed ? 'border-green-200/50' : ''} data-testid={`section-${section.id}`}>
      <button onClick={() => setExpanded(!expanded)} className="w-full text-left">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${section.completed ? 'bg-green-100 text-green-700' : 'bg-muted text-muted-foreground'}`}>
                {section.completed ? <CheckCircle2 className="h-5 w-5" /> : <Icon className="h-5 w-5" />}
              </div>
              <div>
                <CardTitle className="text-base">{section.title}</CardTitle>
                <CardDescription className="text-xs">{section.description}</CardDescription>
              </div>
            </div>
            <ChevronDown className={`h-5 w-5 text-muted-foreground transition-transform ${expanded ? '' : '-rotate-90'}`} />
          </div>
        </CardHeader>
      </button>

      {expanded && (
        <CardContent className="pt-0 space-y-4">
          {section.fields.map(field => (
            <div key={field.key} className="space-y-1.5">
              <label className="text-sm font-medium">{field.label}</label>
              {field.type === 'textarea' ? (
                <Textarea
                  value={data[field.key] || ''}
                  onChange={(e) => updateField(field.key, e.target.value)}
                  placeholder={field.placeholder}
                  rows={3}
                  data-testid={`field-${section.id}-${field.key}`}
                />
              ) : field.type === 'tags' ? (
                <TagInput
                  value={Array.isArray(data[field.key]) ? data[field.key] : []}
                  onChange={(val) => updateField(field.key, val)}
                  placeholder={field.placeholder}
                />
              ) : (
                <Input
                  value={data[field.key] || ''}
                  onChange={(e) => updateField(field.key, e.target.value)}
                  placeholder={field.placeholder}
                  data-testid={`field-${section.id}-${field.key}`}
                />
              )}
            </div>
          ))}
          <Button onClick={handleSave} disabled={saving} size="sm" data-testid={`save-${section.id}`}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
            Salvar
          </Button>
        </CardContent>
      )}
    </Card>
  );
}

export default function Culture() {
  const { token } = useAuth();
  const { currentBrand } = useBrand();
  const [loading, setLoading] = useState(true);
  const [sections, setSections] = useState([]);
  const [progress, setProgress] = useState(0);
  const [score, setScore] = useState(null);
  const headers = { Authorization: `Bearer ${token}` };

  useEffect(() => { if (currentBrand) loadData(); }, [currentBrand]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [cultureRes, scoreRes] = await Promise.all([
        axios.get(`${API}/brands/${currentBrand.brand_id}/culture`, { headers }),
        axios.get(`${API}/brands/${currentBrand.brand_id}/culture/score`, { headers })
      ]);
      setSections(cultureRes.data.sections || []);
      setProgress(cultureRes.data.progress || 0);
      setScore(scoreRes.data);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const handleSave = async (sectionId, data) => {
    try {
      await axios.post(`${API}/brands/${currentBrand.brand_id}/culture`, { section: sectionId, data }, { headers });
      toast.success('Seção salva!');
      loadData();
    } catch (e) { toast.error('Erro ao salvar'); }
  };

  if (!currentBrand) return <div className="flex items-center justify-center h-64"><p className="text-muted-foreground">Selecione uma marca</p></div>;
  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

  const recs = (score?.recommendations || []).filter(Boolean);

  return (
    <div className="space-y-6" data-testid="culture-page">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center">
            <Users className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Cultura & Pessoas</h1>
            <p className="text-muted-foreground">Construa e documente a cultura organizacional alinhada à marca</p>
          </div>
        </div>
        <Badge variant={progress === 100 ? "default" : "secondary"} className="text-sm px-3 py-1">
          {progress}% completo
        </Badge>
      </div>

      {/* Score Cards */}
      <div className="grid md:grid-cols-3 gap-4">
        <Card className="bg-gradient-to-br from-amber-500/10 to-orange-500/5">
          <CardContent className="pt-6 text-center">
            <p className="text-4xl font-bold">{score?.overall_score || 0}</p>
            <p className="text-sm text-muted-foreground">Saúde Cultural</p>
            <Progress value={score?.overall_score || 0} className="h-2 mt-3" />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 text-center">
            <p className="text-3xl font-bold">{sections.filter(s => s.completed).length}/{sections.length}</p>
            <p className="text-sm text-muted-foreground">Seções Completas</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 text-center">
            <p className="text-3xl font-bold">{score?.brand_values?.length || 0}</p>
            <p className="text-sm text-muted-foreground">Valores da Marca</p>
            <div className="flex flex-wrap gap-1 mt-2 justify-center">
              {(score?.brand_values || []).slice(0, 4).map((v, i) => (
                <Badge key={i} variant="outline" className="text-xs">{typeof v === 'string' ? v : v?.name || v}</Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recommendations */}
      {recs.length > 0 && (
        <Card className="bg-amber-50/50 dark:bg-amber-950/10 border-amber-200/50">
          <CardContent className="py-3">
            <p className="text-sm font-medium text-amber-800 dark:text-amber-300 mb-1">Próximos passos:</p>
            <ul className="text-sm text-amber-700 dark:text-amber-400 space-y-0.5">
              {recs.slice(0, 3).map((r, i) => <li key={i}>• {r}</li>)}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Sections */}
      <div className="space-y-3">
        {sections.map(section => (
          <SectionCard key={section.id} section={section} onSave={handleSave} />
        ))}
      </div>
    </div>
  );
}
