

interface SectionItemProps {
  section: string;
  pageIndex: number;
  sectionIndex: number;
  clickedSectionButtons: { [key: string]: boolean | { [key: string]: boolean } };
  handleTickSectionButtonClick: (pageIndex: number, sectionIndex: number) => void;
  handleSectionClick: (section: string) => void;
}

const SectionItem = ({
  section,
  pageIndex,
  sectionIndex,
  clickedSectionButtons,
  handleTickSectionButtonClick,
  handleSectionClick,
}: SectionItemProps) => {
  const pageButtons = clickedSectionButtons[pageIndex];
  const isChecked = typeof pageButtons === 'object' && pageButtons !== null && typeof pageButtons[sectionIndex] === 'boolean'
    ? pageButtons[sectionIndex]
    : false;

  return (
    <div key={sectionIndex} className={`file-item ${isChecked ? 'selected' : ''}`}>
      <button onClick={() => handleTickSectionButtonClick(pageIndex, sectionIndex)}>
        <img
          src={isChecked ? "/icons/tickon.svg" : "/icons/tick.svg"}
          alt="tick"
          className={`tick-icon ${isChecked ? 'green' : ''}`}
        />
      </button>
      <button className="section-button" onClick={() => handleSectionClick(section)}>
        {section}
      </button>
    </div>
  );
};

export default SectionItem;