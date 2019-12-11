import React, { useEffect, useState } from 'react';
import ItemsContainer from '../../lib/ItemsContainer';
import PropTypes from 'prop-types';
import Collection from '../../Firebase/Collection';
import { withAuthorization } from '../../Session';

const Transcripts = props => {
  const TYPE = 'Transcript';
  const UPLOADFOLDER = 'uploads';

  const [ loading, setIsLoading ] = useState(false);
  const [ items, setItems ] = useState([]);
  const [ uid, setUid ] = useState();

  const [ uploadTasks, setUploadTasks ] = useState(new Map());

  const Data = new Collection(
    props.firebase,
    `/projects/${ props.projectId }/transcripts`
  );

  const genUrl = id => {
    return `/projects/${ props.projectId }/transcripts/${ id }/correct`;
  };

  useEffect(() => {
    const getTranscripts = async () => {
      try {
        Data.collection.onSnapshot(snapshot => {
          const transcripts = snapshot.docs.map(doc => {
            return { ...doc.data(), id: doc.id, display: true };
          });
          setItems(transcripts);
        });
      } catch (error) {
        console.error('Error getting documents: ', error);
      }
    };

    const authListener = props.firebase.onAuthUserListener(
      authUser => {
        if (authUser) {
          setUid(authUser.uid);
        }
      },
      () => setUid()
    );

    if (!loading) {
      getTranscripts();
      setIsLoading(true);
    }

    return () => {
      authListener();
    };
  }, [ Data.collection, items, loading, props.firebase, uploadTasks ]);

  // firestore

  const updateTranscript = async (id, item) => {
    await Data.putItem(id, item);
    item.display = true;

    return item;
  };

  const createTranscript = async item => {
    const docRef = await Data.postItem(item);

    return docRef;
  };

  const deleteTranscript = async id => {
    try {
      await Data.deleteItem(id);
    } catch (e) {
      console.error('Failed to delete item from collection: ', e.code_);
    }
    try {
      await props.firebase.storage.child(`users/${ uid }/uploads/${ id }`).delete();
      await props.firebase.storage.child(`users/${ uid }/audio/${ id }`).delete();
    } catch (e) {
      console.error('Failed to delete item in storage: ', e.code_);
    }
  };

  const handleDelete = id => {
    deleteTranscript(id);
  };

  // storage

  const updateUploadTasksProgress = (id, progress) => {
    const newUploading = new Map(uploadTasks); // shallow clone
    newUploading.set(id, progress);

    setUploadTasks(newUploading);
  };

  const handleUploadProgress = (id, snapshot) => {
    var progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
    updateUploadTasksProgress(id, progress);
  };

  const handleUploadError = async (id, error) => {
    console.error('Failed to upload file: ', error);
    const newTasks = new Map(uploadTasks); // shallow clone
    newTasks.delete(id);
    setUploadTasks(newTasks);

    await updateTranscript(id, { status: 'error' });
  };

  const handleUploadComplete = async id => {
    // const downloadURL = await uploadTask.snapshot.ref.getDownloadURL();
    // console.log('File available at', downloadURL);
    console.log('file upload completed');
    const newTasks = new Map(uploadTasks); // shallow clone
    newTasks.delete(id);
    setUploadTasks(newTasks);

    await updateTranscript(id, { status: 'in-progress' });
  };

  const getUploadPath = id => {
    return `users/${ uid }/${ UPLOADFOLDER }/${ id }`;
  };

  const asyncUploadFile = async (id, file) => {
    const path = getUploadPath(id);

    const metadata = {
      customMetadata: {
        userId: uid,
        id: id,
        originalName: file.name,
        folder: UPLOADFOLDER
      }
    };
    const uploadTask = props.firebase.storage.child(path).put(file, metadata);
    await updateTranscript(id, { status: 'uploading' });

    uploadTask.on(
      'state_changed',
      snapshot => {
        handleUploadProgress(id, snapshot);
      },
      async error => {
        await handleUploadError(id, error);
      },
      async () => {
        await handleUploadComplete(id);
      }
    );
  };

  // general

  const handleSave = async item => {
    if (item.id) {
      return await updateTranscript(item.id, item);
    } else {
      const newTranscript = await createTranscript({
        title: item.title,
        description: item.description ? item.description : '',
        status: '',
        projectId: props.projectId
      });

      asyncUploadFile(newTranscript.id, item.file);

      newTranscript.update({
        url: genUrl(newTranscript.id)
      });
    }
  };

  return (
    <ItemsContainer
      type={ TYPE }
      items={ items }
      handleSave={ handleSave }
      handleDelete={ handleDelete }
      uploadTasks={ uploadTasks }
    />
  );
};

Transcripts.propTypes = {
  projectId: PropTypes.any
};

const condition = authUser => !!authUser;
export default withAuthorization(condition)(Transcripts);
