import React from 'react';

const Footer = () => {
  const year = new Date().getFullYear();
  return (
    <footer>
      <div className="p-4 bg-gray-100 text-center shadow-md">
        Copyright © {year} HealthEase Medical. All rights reserved.
      </div>
    </footer>
  );
};

export default Footer;
