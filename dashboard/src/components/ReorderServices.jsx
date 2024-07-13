import React, { useState } from "react";
import { DragDropContext, Droppable, Draggable } from "react-beautiful-dnd";
import styled from "styled-components";
import { Card, P } from "../kit";
import { ArrowDown, ArrowUp, Notches } from "@phosphor-icons/react";
import AnimatedNumber from "./AnimatedNumber";

const ServiceListContainer = styled.div`
  width: 100%;
  max-width: 600px;
`;

const ServiceCard = styled(Card)`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 10px;
  padding: 10px;
  width: 100%;
`;

const ServiceName = styled(P)`
  margin: 0;
`;

const IconContainer = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
`;

export const ReorderServices = ({ services, onUpdate }) => {
  const [serviceList, setServiceList] = useState(services);

  const handleDragEnd = (result) => {
    if (!result.destination) return;

    const items = Array.from(serviceList);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);

    const updatedItems = items.map((item, index) => ({
      ...item,
      sort: index + 1,
    }));

    setServiceList(updatedItems);
    onUpdate(updatedItems);
  };

  return (
    <DragDropContext onDragEnd={handleDragEnd}>
      <Droppable droppableId="services">
        {(provided) => (
          <ServiceListContainer
            {...provided.droppableProps}
            ref={provided.innerRef}
          >
            {serviceList.map((service, index) => (
              <Draggable
                key={service.name}
                draggableId={service.name}
                index={index}
              >
                {(provided) => (
                  <ServiceCard
                    ref={provided.innerRef}
                    {...provided.draggableProps}
                    {...provided.dragHandleProps}
                  >
                    <ServiceName>{service.name}</ServiceName>
                    <IconContainer>
                      <P>
                        {index === 0 ? (
                          "Top"
                        ) : index === serviceList.length - 1 ? (
                          "Bottom"
                        ) : (
                          <AnimatedNumber number={index + 1} />
                        )}
                      </P>
                      <Notches size={24} />
                    </IconContainer>
                  </ServiceCard>
                )}
              </Draggable>
            ))}
            {provided.placeholder}
          </ServiceListContainer>
        )}
      </Droppable>
    </DragDropContext>
  );
};
