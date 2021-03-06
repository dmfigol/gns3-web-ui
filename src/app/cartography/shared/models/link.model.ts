import {Node} from "./node.model";

export class Link {
  capture_file_name: string;
  capture_file_path: string;
  capturing: boolean;
  link_id: string;
  link_type: string;
  nodes: Node[];
  project_id: string;
  distance: number; // this is not from server
  length: number; // this is not from server
  source: Node; // this is not from server
  target: Node; // this is not from server
}
