import React, { useState } from 'react';
import { Clock, Grid3X3 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuthContext } from '@/contexts/AuthContext';
import RecentProjectsModal from './RecentProjectsModal';

const RecentProjects: React.FC = () => {
  const { isAuthenticated } = useAuthContext();
  const [isModalOpen, setIsModalOpen] = useState(false);

  if (!isAuthenticated) {
    return null;
  }

  return (
    <>
      <Button 
        variant="ghost" 
        size="sm" 
        className="gap-2"
        onClick={() => setIsModalOpen(true)}
      >
        <Grid3X3 className="w-4 h-4" />
        <span className="hidden sm:inline">Proyectos</span>
      </Button>

      <RecentProjectsModal 
        open={isModalOpen} 
        onOpenChange={setIsModalOpen} 
      />
    </>
  );
};

export default RecentProjects;
