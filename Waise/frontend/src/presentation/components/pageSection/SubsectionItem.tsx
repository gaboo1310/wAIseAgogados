import { useEffect } from 'react';

interface SubsectionItemProps {
  subsection: string;
  pageName: string;
  sectionName: string;
  clickedSubsectionButtons: { [key: string]: boolean | { [key: string]: boolean } };
  handleTickSubsectionButtonClick: (pageName: string, sectionName: string, subsection: string) => void;
}

const SubsectionItem = ({
  subsection,
  pageName,
  sectionName,
  clickedSubsectionButtons,
  handleTickSubsectionButtonClick,
}: SubsectionItemProps) => {
  const isChecked = typeof clickedSubsectionButtons[`${pageName}-${sectionName}-${subsection}`] === 'boolean'
    ? clickedSubsectionButtons[`${pageName}-${sectionName}-${subsection}`]
    : false;

  useEffect(() => {
    localStorage.setItem('clickedSubsectionButtons', JSON.stringify(clickedSubsectionButtons));
  }, [clickedSubsectionButtons]);

  return (
    <div key={`${pageName}-${sectionName}-${subsection}`} className={`file-item ${isChecked ? 'selected' : ''}`}>
      <button onClick={() => handleTickSubsectionButtonClick(pageName, sectionName, subsection)}>
        <img
          src={isChecked ? "/icons/tickon.svg" : "/icons/tick.svg"}
          alt="tick"
          className={`tick-icon ${isChecked ? 'green' : ''}`}
        />
      </button>
      <button className="subsection-button">
        {subsection}
      </button>
    </div>
  );
};

export default SubsectionItem;