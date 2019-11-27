import React, { useState, useEffect, useReducer } from 'react';
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';
import Button from 'react-bootstrap/Button';
import PropTypes from 'prop-types';

import { anyInText } from '../../../Util/in-text';
import arrayMatch from '../../../Util/array-match';
import List from '@bbc/digital-paper-edit-react-components/List';
import FormModal from '@bbc/digital-paper-edit-react-components/FormModal';
import SearchBar from '@bbc/digital-paper-edit-react-components/SearchBar';

const initialFormState = {
  title: '',
  description: '',
  id: null
};

const formReducer = (state = initialFormState, { type, payload }) => {
  switch (type) {
  case 'update':
    return { ...state, ...payload };
  case 'reset': {
    return { initialFormState };
  }
  default:
    return state;
  }
};

const ItemsContainer = props => {
  const type = props.type;
  const [ showingItems, setShowingItems ] = useState(props.items);
  const [ showModal, setShowModal ] = useState(false);
  const [ formData, dispatchForm ] = useReducer(formReducer, initialFormState);

  const handleSaveForm = item => {
    props.handleSave(item);
    setShowModal(false);
    dispatchForm({ type: 'reset' });
  };

  const handleEditItem = id => {
    const item = props.items.find(i => i.id === id);
    dispatchForm({
      type: 'update',
      payload: item
    });
    setShowModal(true);
  };

  const handleDeleteItem = id => {
    props.handleDelete(id);
  };

  const handleFilterDisplay = (item, text) => {
    if (anyInText([ item.title, item.description ], text)) {
      item.display = true;
    } else {
      item.display = false;
    }

    return item;
  };

  const handleSearch = text => {
    const results = props.items.map(item => handleFilterDisplay(item, text));
    setShowingItems(results);
  };

  const toggleShowModal = () => {
    setShowModal(!showModal);
  };

  useEffect(() => {
    setShowingItems(props.items);
    console.log(showingItems);

    return () => {};
  }, [ props.items, showingItems ]);

  let searchEl;
  let items;

  if (showingItems.length > 0) {
    searchEl = <SearchBar handleSearch={ handleSearch } />;
    items = (
      <List
        items={ showingItems }
        handleEditItem={ handleEditItem }
        handleDeleteItem={ handleDeleteItem }
      />
    );
  } else {
    items = <i>There are no {type}s, create a new one to get started.</i>;
  }

  return (
    <>
      <Row>
        <Col sm={ 9 }>{searchEl}</Col>
        <Col xs={ 12 } sm={ 3 }>
          <Button
            onClick={ toggleShowModal }
            variant="outline-secondary"
            size="sm"
            block
          >
            New {type}
          </Button>
        </Col>
      </Row>
      {showingItems.length > 0 ? <p>{showingItems.length}</p> : null}
      {showingItems.length > 0 ? items : null}
      <FormModal
        { ...formData }
        modalTitle={ formData.id ? `Edit ${ type }` : `New ${ type }` }
        showModal={ showModal }
        handleSaveForm={ handleSaveForm }
        itemType={ type.toLowerCase }
      />
    </>
  );
};

ItemsContainer.propTypes = {
  handleSave: PropTypes.any,
  handleDelete: PropTypes.any,
  items: PropTypes.array.isRequired,
  type: PropTypes.string
};

ItemsContainer.defaultProps = {
  type: 'Project'
};

export default ItemsContainer;
