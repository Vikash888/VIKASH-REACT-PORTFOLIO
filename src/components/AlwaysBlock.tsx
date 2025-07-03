import React from 'react';
import AccessRestricted from './AccessRestricted';

const AlwaysBlock: React.FC = () => {
  console.log('🚫 AlwaysBlock component rendered - should show AccessRestricted');
  return <AccessRestricted email="Test Block" darkMode={false} />;
};

export default AlwaysBlock;
