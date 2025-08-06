import { useState, useCallback } from 'react';
import { getSubsectionsForSection } from '../presentation/pages/waisechat/sectionUtils';

export interface ClickedButtons {
  [key: string]: boolean | { [key: string]: boolean };
}

export interface SelectedSubsection {
  page: number | null;
  section: string | null;
}

interface UseLibrarySelectionReturn {
  clickedPageButtons: ClickedButtons;
  clickedSectionButtons: ClickedButtons;
  clickedSubsectionButtons: ClickedButtons;
  selectedPageSections: any;
  selectedPageIndex: number | null;
  selectedSubsection: SelectedSubsection;
  subsections: string[];
  
  handleTickPageButtonClick: (pageIndex: number) => void;
  handleTickSectionButtonClick: (pageIndex: number, sectionName: string) => void;
  handleTickSubsectionButtonClick: (subsectionName: string) => void;
  handlePageClick: (pageIndex: number) => void;
  handleSectionClick: (sectionName: string, pageIndex: number) => void;
  handleSelectAll: () => void;
  handleReset: () => void;
  getSelectedLibraryData: () => any;
}

export const useLibrarySelection = (): UseLibrarySelectionReturn => {
  const [clickedPageButtons, setClickedPageButtons] = useState<ClickedButtons>({});
  const [clickedSectionButtons, setClickedSectionButtons] = useState<ClickedButtons>({});
  const [clickedSubsectionButtons, setClickedSubsectionButtons] = useState<ClickedButtons>({});
  const [selectedPageSections, setSelectedPageSections] = useState<any>({});
  const [selectedPageIndex, setSelectedPageIndex] = useState<number | null>(null);
  const [selectedSubsection, setSelectedSubsection] = useState<SelectedSubsection>({
    page: null,
    section: null
  });
  const [subsections, setSubsections] = useState<string[]>([]);

  const handleTickPageButtonClick = useCallback((pageIndex: number) => {
    setClickedPageButtons(prev => ({
      ...prev,
      [pageIndex]: !prev[pageIndex]
    }));
  }, []);

  const handleTickSectionButtonClick = useCallback((pageIndex: number, sectionName: string) => {
    const key = `${pageIndex}-${sectionName}`;
    setClickedSectionButtons(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  }, []);

  const handleTickSubsectionButtonClick = useCallback((subsectionName: string) => {
    setClickedSubsectionButtons(prev => ({
      ...prev,
      [subsectionName]: !prev[subsectionName]
    }));
  }, []);

  const handlePageClick = useCallback((pageIndex: number) => {
    setSelectedPageIndex(pageIndex);
  }, []);

  const handleSectionClick = useCallback((sectionName: string, pageIndex: number) => {
    setSelectedSubsection({ page: pageIndex, section: sectionName });
    const subsectionsList = getSubsectionsForSection(pageIndex, sectionName);
    setSubsections(subsectionsList);
  }, []);

  const handleSelectAll = useCallback(() => {
    const allPages: ClickedButtons = {};
    const allSections: ClickedButtons = {};
    const allSubsections: ClickedButtons = {};

    // This would need to be implemented based on your data structure
    // For now, it's a placeholder that sets all items to selected
    setClickedPageButtons(allPages);
    setClickedSectionButtons(allSections);
    setClickedSubsectionButtons(allSubsections);
  }, []);

  const handleReset = useCallback(() => {
    setClickedPageButtons({});
    setClickedSectionButtons({});
    setClickedSubsectionButtons({});
    setSelectedPageSections({});
    setSelectedPageIndex(null);
    setSelectedSubsection({ page: null, section: null });
    setSubsections([]);
  }, []);

  const getSelectedLibraryData = useCallback(() => {
    const selectedData = {
      pages: Object.keys(clickedPageButtons).filter(key => clickedPageButtons[key]),
      sections: Object.keys(clickedSectionButtons).filter(key => clickedSectionButtons[key]),
      subsections: Object.keys(clickedSubsectionButtons).filter(key => clickedSubsectionButtons[key])
    };
    
    return selectedData;
  }, [clickedPageButtons, clickedSectionButtons, clickedSubsectionButtons]);

  return {
    clickedPageButtons,
    clickedSectionButtons,
    clickedSubsectionButtons,
    selectedPageSections,
    selectedPageIndex,
    selectedSubsection,
    subsections,
    handleTickPageButtonClick,
    handleTickSectionButtonClick,
    handleTickSubsectionButtonClick,
    handlePageClick,
    handleSectionClick,
    handleSelectAll,
    handleReset,
    getSelectedLibraryData
  };
};