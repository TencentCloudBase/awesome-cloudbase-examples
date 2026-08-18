import HOMEPAGE from '../pages/HomePage.jsx';
import EXHIBITIONDETAILPAGE from '../pages/ExhibitionDetailPage.jsx';
import ARTWORKDETAILPAGE from '../pages/ArtworkDetailPage.jsx';
import EXHIBITIONSPAGE from '../pages/ExhibitionsPage.jsx';
import ARTWORKSEARCHPAGE from '../pages/ArtworkSearchPage.jsx';
import APPOINTMENTPAGE from '../pages/AppointmentPage.jsx';
import PROFILEPAGE from '../pages/ProfilePage.jsx';
export const routers = [{
  id: "HomePage",
  component: HOMEPAGE
}, {
  id: "ExhibitionDetailPage",
  component: EXHIBITIONDETAILPAGE
}, {
  id: "ArtworkDetailPage",
  component: ARTWORKDETAILPAGE
}, {
  id: "ExhibitionsPage",
  component: EXHIBITIONSPAGE
}, {
  id: "ArtworkSearchPage",
  component: ARTWORKSEARCHPAGE
}, {
  id: "AppointmentPage",
  component: APPOINTMENTPAGE
}, {
  id: "ProfilePage",
  component: PROFILEPAGE
}]