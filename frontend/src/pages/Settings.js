import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { User, Shield, Building2, Users, Paintbrush, Link2, Palette, Settings as SettingsIcon } from 'lucide-react';
import SettingsProfile from '../components/settings/SettingsProfile';
import SettingsSecurity from '../components/settings/SettingsSecurity';
import SettingsBrands from '../components/settings/SettingsBrands';
import SettingsTeam from '../components/settings/SettingsTeam';
import SettingsIntegrations from '../components/settings/SettingsIntegrations';
import SettingsPersonalization from '../components/settings/SettingsPersonalization';
import WhiteLabelSettings from '../components/WhiteLabelSettings';

export const Settings = () => {
  const [activeTab, setActiveTab] = useState('profile');

  return (
    <div className="space-y-6" data-testid="settings-page">
      {/* Header */}
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 rounded-xl bg-gray-500 flex items-center justify-center">
          <SettingsIcon className="h-6 w-6 text-white" />
        </div>
        <div>
          <h1 className="font-heading text-2xl font-bold">Configuracoes</h1>
          <p className="text-muted-foreground">Gerencie seu perfil e preferencias</p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-7 lg:w-auto lg:inline-grid">
          <TabsTrigger value="profile" className="gap-2" data-testid="tab-profile">
            <User className="h-4 w-4" />
            <span className="hidden sm:inline">Perfil</span>
          </TabsTrigger>
          <TabsTrigger value="security" className="gap-2" data-testid="tab-security">
            <Shield className="h-4 w-4" />
            <span className="hidden sm:inline">Seguranca</span>
          </TabsTrigger>
          <TabsTrigger value="brands" className="gap-2" data-testid="tab-brands">
            <Building2 className="h-4 w-4" />
            <span className="hidden sm:inline">Marcas</span>
          </TabsTrigger>
          <TabsTrigger value="team" className="gap-2" data-testid="tab-team">
            <Users className="h-4 w-4" />
            <span className="hidden sm:inline">Equipe</span>
          </TabsTrigger>
          <TabsTrigger value="white-label" className="gap-2" data-testid="tab-white-label">
            <Paintbrush className="h-4 w-4" />
            <span className="hidden sm:inline">White Label</span>
          </TabsTrigger>
          <TabsTrigger value="integrations" className="gap-2" data-testid="tab-integrations">
            <Link2 className="h-4 w-4" />
            <span className="hidden sm:inline">Integracoes</span>
          </TabsTrigger>
          <TabsTrigger value="personalization" className="gap-2" data-testid="tab-personalization">
            <Palette className="h-4 w-4" />
            <span className="hidden sm:inline">Personalizacao</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="profile" className="space-y-6">
          <SettingsProfile />
        </TabsContent>

        <TabsContent value="security" className="space-y-6">
          <SettingsSecurity />
        </TabsContent>

        <TabsContent value="brands" className="space-y-6">
          <SettingsBrands />
        </TabsContent>

        <TabsContent value="team" className="space-y-6">
          <SettingsTeam />
        </TabsContent>

        <TabsContent value="white-label" className="space-y-6">
          <WhiteLabelSettings />
        </TabsContent>

        <TabsContent value="integrations" className="space-y-6">
          <SettingsIntegrations />
        </TabsContent>

        <TabsContent value="personalization" className="space-y-6">
          <SettingsPersonalization />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Settings;
