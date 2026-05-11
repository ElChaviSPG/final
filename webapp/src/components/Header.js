"use client";
import Link from "next/link";

export default function Header() {
  return (
    <div id="header_top" className="header_top">
      <div className="container">
        <div className="hleft">
          <Link className="header-brand" href="/">
            <i className="fa fa-graduation-cap brand-logo"></i>
          </Link>
          <div className="dropdown">
            <a href="javascript:void(0)" className="nav-link icon menu_toggle">
              <i className="fe fe-align-center"></i>
            </a>
            <a href="#" className="nav-link icon">
              <i className="fe fe-search" data-toggle="tooltip" data-placement="right" title="Search..."></i>
            </a>
            <a href="#" className="nav-link icon app_inbox">
              <i className="fe fe-inbox" data-toggle="tooltip" data-placement="right" title="Inbox"></i>
            </a>
            <a href="#" className="nav-link icon app_file xs-hide">
              <i className="fe fe-folder" data-toggle="tooltip" data-placement="right" title="File Manager"></i>
            </a>
            <a href="#" className="nav-link icon xs-hide">
              <i className="fe fe-share-2" data-toggle="tooltip" data-placement="right" title="Social Media"></i>
            </a>
            <a href="javascript:void(0)" className="nav-link icon theme_btn">
              <i className="fe fe-feather"></i>
            </a>
            <a href="javascript:void(0)" className="nav-link icon settingbar">
              <i className="fe fe-settings"></i>
            </a>
          </div>
        </div>
        <div className="hright">
          <a href="javascript:void(0)" className="nav-link icon right_tab">
            <i className="fe fe-align-right"></i>
          </a>
          <a href="#" className="nav-link icon settingbar">
            <i className="fe fe-power"></i>
          </a>
        </div>
      </div>
    </div>
  );
}
