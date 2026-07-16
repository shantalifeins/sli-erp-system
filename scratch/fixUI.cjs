const fs = require('fs');
let content = fs.readFileSync('src/modules/admin/pages/NotificationSettings.tsx', 'utf8');

const wrongSearchBar = `      {/* Search Bar */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input 
          type="text" 
          placeholder="Search notifications..." 
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-shadow"
        />
      </div>

`;

// Remove the wrong search bar completely
content = content.replace(wrongSearchBar, '');

// Now we need to insert the search bar right before the table.
// The table is under `<div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">` that contains `<table className="min-w-full divide-y divide-gray-200">`.
// Let's find `<table className="minw-full...`
const tablePattern = '<table className="min-w-full divide-y divide-gray-200">';
// The line right above it is `<div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">`

content = content.replace(
  '<div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">\n        <table',
  wrongSearchBar + '<div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">\n        <table'
);

fs.writeFileSync('src/modules/admin/pages/NotificationSettings.tsx', content);
console.log('Fixed UI syntax');
