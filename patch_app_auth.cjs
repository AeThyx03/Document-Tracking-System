const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

code = code.replace(
  '          if (staff && staff.length > 0) {\n            setStaffList(staff);\n            saveStoredStaffMembers(staff);\n            \n            // Map Firebase user to personnel directory\n            const matchedStaff = staff.find(s => s.email === authedUser.email);\n            if (matchedStaff) {\n               setCurrentUser(matchedStaff);\n               localStorage.setItem(\'possd_active_user\', JSON.stringify(matchedStaff));\n            } else if (authedUser.email) {\n               // Default viewer role\n               const viewer: AppUserRole = {\n                 id: authedUser.uid,\n                 name: authedUser.displayName || authedUser.email.split(\'@\')[0],\n                 role: \'Viewer\', division: \'General\', username: authedUser.email.split(\'@\')[0], email: authedUser.email\n               };\n               setCurrentUser(viewer);\n               localStorage.setItem(\'possd_active_user\', JSON.stringify(viewer));\n            }\n          }',
  `          let currentStaffList = staffListRef.current;
          if (staff && staff.length > 0) {
            setStaffList(staff);
            saveStoredStaffMembers(staff);
            currentStaffList = staff;
          }
          
          // Map Firebase user to personnel directory
          const matchedStaff = currentStaffList.find(s => s.email === authedUser.email);
          if (matchedStaff) {
             setCurrentUser(matchedStaff);
             localStorage.setItem('possd_active_user', JSON.stringify(matchedStaff));
          } else if (authedUser.email) {
             // Default viewer role
             const viewer: AppUserRole = {
               id: authedUser.uid,
               name: authedUser.displayName || authedUser.email.split('@')[0],
               role: 'Viewer', division: 'General', username: authedUser.email.split('@')[0], email: authedUser.email
             };
             setCurrentUser(viewer);
             localStorage.setItem('possd_active_user', JSON.stringify(viewer));
          }`
);

fs.writeFileSync('src/App.tsx', code, 'utf8');
