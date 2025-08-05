

interface PageItemProps {
  page: any; // Replace 'any' with the actual type if available
  pageIndex: number;
  clickedPageButtons: { [key: string]: boolean | { [key: string]: boolean } };
  handleTickPageButtonClick: (pageIndex: number) => void;
  handlePageClick: (pageIndex: number, sections: string[]) => void;
}

const PageItem = ({
  page,
  pageIndex,
  clickedPageButtons,
  handleTickPageButtonClick,
  handlePageClick,
}: PageItemProps) => {
  const isChecked = typeof clickedPageButtons[pageIndex] === 'boolean'
    ? clickedPageButtons[pageIndex]
    : false;

  return (
    <div key={pageIndex} className={`file-item ${isChecked ? 'selected' : ''}`}>
      <button onClick={() => handleTickPageButtonClick(pageIndex)}>
        <img
          src={isChecked ? "/icons/tickon.svg" : "/icons/tick.svg"}
          alt="tick"
          className={`tick-icon ${isChecked ? 'green' : ''}`}
        />
      </button>
      <button className="page-button" onClick={() => handlePageClick(pageIndex, page.sections)}>
        {page.name}
      </button>
    </div>
  );
};

export default PageItem;