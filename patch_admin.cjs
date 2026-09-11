const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

const targetStr = `// Map Firebase user to personnel directory
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
          }`;

const replaceStr = `// Map Firebase user to personnel directory
          let matchedStaff = currentStaffList.find(s => s.email === authedUser.email || (s.name.includes('Rey Reginald') && authedUser.email === 'reymojica01@gmail.com'));
          
          if (authedUser.email === 'reymojica01@gmail.com') {
             if (matchedStaff) {
                matchedStaff = { ...matchedStaff, role: 'System Admin', email: authedUser.email };
             } else {
                matchedStaff = {
                   id: authedUser.uid,
                   name: authedUser.displayName || 'Rey Reginald A. Mojica',
                   role: 'System Admin',
                   division: 'CMED',
                   username: 'reymojica01',
                   email: authedUser.email
                };
             }
             
             // Ensure it's in the staff list so it persists correctly
             const updatedList = currentStaffList.some(s => s.id === matchedStaff.id)
                ? currentStaffList.map(s => s.id === matchedStaff.id ? matchedStaff : s)
                : [...currentStaffList, matchedStaff];
             setStaffList(updatedList);
             saveStoredStaffMembers(updatedList);
          }
          
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
          }`;

code = code.replace(targetStr, replaceStr);
fs.writeFileSync('src/App.tsx', code, 'utf8');
