import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useBrand } from '../contexts/BrandContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Input } from '../components/ui/input';
import { Textarea } from '../components/ui/textarea';
import { Label } from '../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { toast } from 'sonner';
import {
  BookOpen, Plus, Search, Loader2, Edit3, Trash2, Eye, Calendar,
  Target, Palette, Crosshair, Users, Globe, BarChart3, Bookmark, GraduationCap
} from 'lucide-react';
import axios from 'axios';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const CATEGORY_ICONS = {
  estrategia: Target, identidade: Palette, posicionamento: Crosshair,
  cultura: Users, digital: Globe, metricas: BarChart3, cases: Bookmark, geral: BookOpen
};

function ArticleForm({ article, categories, onSave, onClose }) {
  const [form, setForm] = useState({
    title: article?.title || '', summary: article?.summary || '',
    content: article?.content || '', category: article?.category || 'geral',
    tags: (article?.tags || []).join(', '), published: article?.published || false
  });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async () => {
    if (!form.title.trim()) { toast.error('Título é obrigatório'); return; }
    setSaving(true);
    try {
      await onSave({
        ...form,
        tags: form.tags.split(',').map(t => t.trim()).filter(Boolean)
      });
      onClose();
    } finally { setSaving(false); }
  };

  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <Label>Título</Label>
        <Input value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} placeholder="Ex: Como definir o posicionamento da marca" data-testid="article-title" />
      </div>
      <div className="space-y-1.5">
        <Label>Resumo</Label>
        <Textarea value={form.summary} onChange={e => setForm(p => ({ ...p, summary: e.target.value }))} placeholder="Breve descrição do conteúdo" rows={2} data-testid="article-summary" />
      </div>
      <div className="space-y-1.5">
        <Label>Conteúdo</Label>
        <Textarea value={form.content} onChange={e => setForm(p => ({ ...p, content: e.target.value }))} placeholder="Escreva o conteúdo completo aqui..." rows={8} className="font-mono text-sm" data-testid="article-content" />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label>Categoria</Label>
          <Select value={form.category} onValueChange={v => setForm(p => ({ ...p, category: v }))}>
            <SelectTrigger data-testid="article-category"><SelectValue /></SelectTrigger>
            <SelectContent>
              {categories.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>Tags (separar por vírgula)</Label>
          <Input value={form.tags} onChange={e => setForm(p => ({ ...p, tags: e.target.value }))} placeholder="branding, estratégia" data-testid="article-tags" />
        </div>
      </div>
      <div className="flex items-center justify-between pt-2">
        <label className="flex items-center gap-2 text-sm cursor-pointer">
          <input type="checkbox" checked={form.published} onChange={e => setForm(p => ({ ...p, published: e.target.checked }))} className="rounded" />
          Publicar imediatamente
        </label>
        <div className="flex gap-2">
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={handleSubmit} disabled={saving} data-testid="save-article-btn">
            {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            {article ? 'Atualizar' : 'Criar Artigo'}
          </Button>
        </div>
      </div>
    </div>
  );
}

function ArticleCard({ article, categories, onEdit, onDelete, onView }) {
  const Icon = CATEGORY_ICONS[article.category] || BookOpen;
  const catName = categories.find(c => c.id === article.category)?.name || article.category;

  return (
    <Card className="hover:shadow-md transition-shadow cursor-pointer group" data-testid={`article-${article.article_id}`}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0" onClick={() => onView(article)}>
            <div className="flex items-center gap-2 mb-1.5">
              <Badge variant="outline" className="text-xs gap-1 flex-shrink-0"><Icon className="h-3 w-3" />{catName}</Badge>
              {article.published ? (
                <Badge className="bg-green-100 text-green-700 text-xs">Publicado</Badge>
              ) : (
                <Badge variant="secondary" className="text-xs">Rascunho</Badge>
              )}
            </div>
            <h3 className="font-semibold truncate">{article.title}</h3>
            {article.summary && <p className="text-sm text-muted-foreground line-clamp-2 mt-1">{article.summary}</p>}
            <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
              <span className="flex items-center gap-1"><Calendar className="h-3 w-3" />{new Date(article.created_at).toLocaleDateString('pt-BR')}</span>
              <span className="flex items-center gap-1"><Eye className="h-3 w-3" />{article.views} views</span>
              {article.author_name && <span>{article.author_name}</span>}
            </div>
          </div>
          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onEdit(article)} data-testid={`edit-${article.article_id}`}>
              <Edit3 className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500" onClick={() => onDelete(article)} data-testid={`delete-${article.article_id}`}>
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function Academy() {
  const { token } = useAuth();
  const { currentBrand } = useBrand();
  const [loading, setLoading] = useState(true);
  const [articles, setArticles] = useState([]);
  const [categories, setCategories] = useState([]);
  const [stats, setStats] = useState({});
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [viewing, setViewing] = useState(null);
  const headers = { Authorization: `Bearer ${token}` };

  useEffect(() => { if (currentBrand) loadData(); }, [currentBrand]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [articlesRes, catsRes] = await Promise.all([
        axios.get(`${API}/brands/${currentBrand.brand_id}/academy`, { headers }),
        axios.get(`${API}/academy/categories`, { headers })
      ]);
      setArticles(articlesRes.data.articles || []);
      setStats(articlesRes.data.stats || {});
      setCategories(catsRes.data.categories || []);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const handleSave = async (data) => {
    if (editing) {
      await axios.put(`${API}/brands/${currentBrand.brand_id}/academy/${editing.article_id}`, data, { headers });
      toast.success('Artigo atualizado!');
    } else {
      await axios.post(`${API}/brands/${currentBrand.brand_id}/academy`, data, { headers });
      toast.success('Artigo criado!');
    }
    setEditing(null);
    setShowForm(false);
    loadData();
  };

  const handleDelete = async (article) => {
    if (!window.confirm(`Remover "${article.title}"?`)) return;
    await axios.delete(`${API}/brands/${currentBrand.brand_id}/academy/${article.article_id}`, { headers });
    toast.success('Artigo removido');
    loadData();
  };

  if (!currentBrand) return <div className="flex items-center justify-center h-64"><p className="text-muted-foreground">Selecione uma marca</p></div>;
  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

  const filtered = articles.filter(a => {
    if (filter !== 'all' && a.category !== filter) return false;
    if (search && !a.title.toLowerCase().includes(search.toLowerCase()) && !a.summary?.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="space-y-6" data-testid="academy-page">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center">
            <GraduationCap className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">LaBrand Academy</h1>
            <p className="text-muted-foreground">Base de conhecimento e conteúdos sobre marca</p>
          </div>
        </div>
        <Button onClick={() => { setEditing(null); setShowForm(true); }} data-testid="new-article-btn">
          <Plus className="h-4 w-4 mr-2" /> Novo Conteúdo
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <Card><CardContent className="pt-6 text-center"><p className="text-3xl font-bold">{stats.total || 0}</p><p className="text-sm text-muted-foreground">Total</p></CardContent></Card>
        <Card><CardContent className="pt-6 text-center"><p className="text-3xl font-bold text-green-600">{stats.published || 0}</p><p className="text-sm text-muted-foreground">Publicados</p></CardContent></Card>
        <Card><CardContent className="pt-6 text-center"><p className="text-3xl font-bold text-amber-600">{stats.draft || 0}</p><p className="text-sm text-muted-foreground">Rascunhos</p></CardContent></Card>
      </div>

      {/* Form Dialog */}
      <Dialog open={showForm || !!editing} onOpenChange={(open) => { if (!open) { setShowForm(false); setEditing(null); } }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editing ? 'Editar Conteúdo' : 'Novo Conteúdo'}</DialogTitle></DialogHeader>
          <ArticleForm article={editing} categories={categories} onSave={handleSave} onClose={() => { setShowForm(false); setEditing(null); }} />
        </DialogContent>
      </Dialog>

      {/* View Dialog */}
      <Dialog open={!!viewing} onOpenChange={(open) => { if (!open) setViewing(null); }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          {viewing && (
            <>
              <DialogHeader>
                <div className="flex items-center gap-2 mb-2">
                  <Badge variant="outline">{categories.find(c => c.id === viewing.category)?.name}</Badge>
                  {viewing.tags?.map((t, i) => <Badge key={i} variant="secondary" className="text-xs">{t}</Badge>)}
                </div>
                <DialogTitle className="text-xl">{viewing.title}</DialogTitle>
                {viewing.summary && <p className="text-muted-foreground">{viewing.summary}</p>}
              </DialogHeader>
              <div className="prose prose-sm dark:prose-invert max-w-none whitespace-pre-wrap mt-4">
                {viewing.content || <p className="text-muted-foreground italic">Sem conteúdo</p>}
              </div>
              <div className="flex items-center justify-between pt-4 border-t text-sm text-muted-foreground">
                <span>{viewing.author_name} • {new Date(viewing.created_at).toLocaleDateString('pt-BR')}</span>
                <Button variant="outline" size="sm" onClick={() => { setViewing(null); setEditing(viewing); }}>
                  <Edit3 className="h-4 w-4 mr-2" /> Editar
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Filters */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar conteúdos..." className="pl-9" data-testid="search-articles" />
        </div>
        <div className="flex gap-1 flex-wrap">
          <Button variant={filter === 'all' ? 'default' : 'outline'} size="sm" onClick={() => setFilter('all')}>Todos</Button>
          {categories.map(c => {
            const Icon = CATEGORY_ICONS[c.id] || BookOpen;
            return (
              <Button key={c.id} variant={filter === c.id ? 'default' : 'outline'} size="sm" onClick={() => setFilter(c.id)} className="gap-1">
                <Icon className="h-3 w-3" />{c.name}
              </Button>
            );
          })}
        </div>
      </div>

      {/* Articles */}
      {filtered.length === 0 ? (
        <Card className="border-dashed border-2">
          <CardContent className="py-12 text-center">
            <GraduationCap className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
            <h3 className="text-lg font-semibold mb-2">{articles.length === 0 ? 'Nenhum conteúdo ainda' : 'Nenhum resultado'}</h3>
            <p className="text-muted-foreground mb-4 max-w-md mx-auto">
              {articles.length === 0
                ? 'Comece a construir a base de conhecimento da sua marca. Adicione artigos, guias e referências.'
                : 'Nenhum conteúdo corresponde aos filtros selecionados.'}
            </p>
            {articles.length === 0 && (
              <Button onClick={() => { setEditing(null); setShowForm(true); }}>
                <Plus className="h-4 w-4 mr-2" /> Criar Primeiro Conteúdo
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filtered.map(article => (
            <ArticleCard
              key={article.article_id}
              article={article}
              categories={categories}
              onEdit={(a) => setEditing(a)}
              onDelete={handleDelete}
              onView={(a) => setViewing(a)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
