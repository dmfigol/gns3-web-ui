import { Widget } from "./widget";
import { Node } from "../models/node.model";
import { SVGSelection } from "../../../map/models/types";
import {event, select} from "d3-selection";
import {D3DragEvent, drag} from "d3-drag";
import {Symbol} from "../../../shared/models/symbol";


export class NodesWidget implements Widget {
  private debug = false;

  private onContextMenuCallback: (event: any, node: Node) => void;
  private onNodeClickedCallback: (event: any, node: Node) => void;
  private onNodeDraggedCallback: (event: any, node: Node) => void;
  private onNodeDraggingCallbacks: ((event: any, node: Node) => void)[] = [];

  private symbols: Symbol[] = [];

  constructor() {}

  public setOnContextMenuCallback(onContextMenuCallback: (event: any, node: Node) => void) {
    this.onContextMenuCallback = onContextMenuCallback;
  }

  public setOnNodeClickedCallback(onNodeClickedCallback: (event: any, node: Node) => void) {
    this.onNodeClickedCallback = onNodeClickedCallback;
  }

  public setOnNodeDraggedCallback(onNodeDraggedCallback: (event: any, node: Node) => void) {
    this.onNodeDraggedCallback = onNodeDraggedCallback;
  }

  public addOnNodeDraggingCallback(onNodeDraggingCallback: (n: Node) => void) {
    this.onNodeDraggingCallbacks.push(onNodeDraggingCallback);
  }

  public setSymbols(symbols: Symbol[]) {
    this.symbols = symbols;
  }

  private executeOnNodeDraggingCallback(n: Node) {
    this.onNodeDraggingCallbacks.forEach((callback: (n: Node) => void) => {
      callback(n);
    });
  }

  public revise(selection: SVGSelection) {
    selection
      .attr('transform', (n: Node) => {
        return `translate(${n.x},${n.y})`;
      });

    selection
      .select<SVGTextElement>('text.label')
        // .attr('y', (n: Node) => n.label.y - n.height / 2. + 10)  // @todo: server computes y in auto way
        .attr('style', (n: Node) => n.label.style)
        .text((n: Node) => n.label.text)
        .attr('x', function (this: SVGTextElement, n: Node) {
          if (n.label.x === null) {
            // center
            const bbox = this.getBBox();
            return -bbox.width / 2.;
          }
          return n.label.x - n.width / 2.;
        })
        .attr('y', function (this: SVGTextElement, n: Node) {
          if (n.label.x === null) {
            // center
            const bbox = this.getBBox();
            return - n.height / 2. - bbox.height ;
          }
          return n.label.y - n.height / 2.;
        });

    selection
      .select<SVGTextElement>('text.node_point_label')
        .text((n: Node) => `(${n.x}, ${n.y})`);

  }

  public draw(view: SVGSelection, nodes: Node[]) {
    const self = this;

    const node = view
      .selectAll<SVGGElement, any>('g.node')
        .data(nodes, (n: Node) => {
          return n.node_id;
        });

    const node_enter = node
      .enter()
        .append<SVGGElement>('g')
        .attr('class', 'node');

    node_enter
      .append<SVGImageElement>('image')
        .attr('xlink:href', (n: Node) => {
          const symbol = this.symbols.find((s: Symbol) => s.symbol_id === n.symbol);
          if (symbol) {
            return 'data:image/svg+xml;base64,' + btoa(symbol.raw);
          }
          // @todo; we need to have default image
          return 'data:image/svg+xml;base64,none';
        })
        .attr('width', (n: Node) => n.width)
        .attr('height', (n: Node) => n.height)
        .attr('x', (n: Node) => -n.width / 2.)
        .attr('y', (n: Node) => -n.height / 2.);

        // .attr('width', (n: Node) => n.width)
        // .attr('height', (n: Node) => n.height);
        // .on('mouseover', function (this, n: Node) {
        //   select(this).attr("class", "over");
        // })
        // .on('mouseout', function (this, n: Node) {
        //   select(this).attr("class", "");
        // });

    node_enter
      .append<SVGTextElement>('text')
        .attr('class', 'label');

    if (this.debug) {
      node_enter
        .append<SVGCircleElement>('circle')
          .attr('class', 'node_point')
          .attr('r', 2);

      node_enter
        .append<SVGTextElement>('text')
          .attr('class', 'node_point_label')
          .attr('x', '-100')
          .attr('y', '0');
    }

    const node_merge = node
      .merge(node_enter)
        .on("contextmenu", function (n: Node, i: number) {
          event.preventDefault();
          if (self.onContextMenuCallback !== null) {
            self.onContextMenuCallback(event, n);
          }
        })
        .on('click', (n: Node) => {
          if (self.onNodeClickedCallback) {
            self.onNodeClickedCallback(event, n);
          }
        });


    this.revise(node_merge);

    const callback = function (this: SVGGElement, n: Node) {
      const e: D3DragEvent<SVGGElement, Node, Node> = event;

      n.x = e.x;
      n.y = e.y;

      self.revise(select(this));
      self.executeOnNodeDraggingCallback(n);
    };

    const dragging = () => {
      return drag<SVGGElement, Node>()
        .on('drag', callback)
        .on('end', (n: Node) => {
          if (self.onNodeDraggedCallback) {
            const e: D3DragEvent<SVGGElement, Node, Node> = event;
            self.onNodeDraggedCallback(e, n);
          }
        });
    };

    node_merge.call(dragging());

    node
      .exit()
        .remove();
  }
}
