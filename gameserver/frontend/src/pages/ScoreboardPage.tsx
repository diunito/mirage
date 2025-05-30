import {
    Box,
    Image,
    Paper,
    Pill,
    ScrollAreaAutosize,
    Space,
    Table,
    Text,
    Title,
    Tooltip,
} from "@mantine/core";
import {
    useChartQuery,
    useStatusQuery,
    useScoreboardQuery,
    useTeamSolver,
    TeamStatusInfo,
    TeamScores,
} from "../scripts/query";
import { ChartTooltipProps, LineChart } from "@mantine/charts";
import {
    hashedColor,
    scoreBoardSortFunction,
    useGlobalState,
    useStickyScrollableHeader,
} from "../scripts/utils";
import { MdGroups } from "react-icons/md";
import { FaHashtag } from "react-icons/fa6";
import { ImTarget } from "react-icons/im";
import { FaServer } from "react-icons/fa6";
import { ServiceScoreData } from "../components/ServiceScoreData";
import { RoundCounter } from "../components/RoundCounter";
import { useNavigate } from "react-router-dom";
import { DiffArrow } from "../components/DiffArrow";
import { useMemo, memo, useEffect } from "react";
import { HiOutlineCursorClick } from "react-icons/hi";
import { RiGhostFill } from "react-icons/ri";

const ChartTooltip = memo(({ label, payload }: ChartTooltipProps) => {
    const teamSolver = useTeamSolver();
    if (!payload) return null;

    const topTeams = 10;
    return (
        <Paper
            px="md"
            py="sm"
            withBorder
            shadow="md"
            radius="md"
            style={{ zIndex: 2 }}
        >
            <Box>
                <Box style={{ fontWeight: 400 }}>Round {label}</Box>
                <Space h="md" />
                <b>Top {topTeams} Teams:</b>
                {payload
                    .sort((a, b) => parseFloat(b.value) - parseFloat(a.value))
                    .slice(0, topTeams)
                    .map((item) => (
                        <Box key={item.dataKey}>
                            <span style={{ color: item.color }}>
                                {teamSolver(atob(item.name))?.name}
                            </span>
                            : {item.value} points
                        </Box>
                    ))}
            </Box>
        </Paper>
    );
});

const TeamRow = memo(
    ({
        teamData,
        pos,
        services,
        teamInfo,
        clickable,
    }: {
        teamData: TeamScores;
        pos: number;
        services: { name: string }[];
        teamInfo?: TeamStatusInfo;
        clickable?: boolean;
    }) => {
        const navigate = useNavigate();
        const setLoading = useGlobalState((state) => state.setLoading);
        const redirectProps = clickable
            ? {
                  onClick: () => {
                      setLoading(true);
                      navigate(`/scoreboard/team/${teamInfo?.id}`);
                  },
                  style: { cursor: "pointer" },
              }
            : {};

        return (
            <Table.Tr>
                <Table.Td {...redirectProps} px="md">
                    <Box className="center-flex">
                        <Text>{pos + 1}</Text>
                    </Box>
                </Table.Td>
                <Table.Td {...redirectProps}>
                    <Box className="center-flex" style={{ width: "100%" }}>
                        <Image
                            src={
                                teamInfo?.image &&
                                (teamInfo.image.startsWith("http://") ||
                                    teamInfo.image.startsWith("https://"))
                                    ? teamInfo.image
                                    : "/images/teams/" +
                                      (teamInfo?.image == "" || teamInfo == null
                                          ? "ctfbox-player.png"
                                          : teamInfo.image)
                            }
                            alt={teamData.team}
                            mah={120}
                            mih={120}
                            maw={120}
                            miw={120}
                        />
                    </Box>
                </Table.Td>
                <Table.Td>
                    <Box className="center-flex-col">
                        <Text {...redirectProps} className="center-flex">
                            {teamInfo?.name ?? "Unknown Team"}{" "}
                            {clickable && <HiOutlineCursorClick size={12} />}
                        </Text>
                        <Space h="3px" />
                        <Pill
                            style={{
                                backgroundColor:
                                    "var(--mantine-color-cyan-filled)",
                                color: "white",
                                fontWeight: "bold",
                            }}
                            className="center-flex"
                        >
                            {teamData.team}
                            {teamInfo?.nop ? (
                                <Tooltip label={"NOP team"}>
                                    <span>
                                        <RiGhostFill
                                            style={{
                                                marginBottom: -2,
                                                marginLeft: 4,
                                            }}
                                        />
                                    </span>
                                </Tooltip>
                            ) : null}
                        </Pill>
                    </Box>
                </Table.Td>
                <Table.Td>
                    <Box className="center-flex-row">
                        <Text
                            className="center-flex"
                            style={{ fontWeight: "bolder" }}
                        >
                            {teamData.score.toFixed(2)}
                        </Text>
                        <DiffArrow
                            diff={teamData.services.reduce(
                                (acc, d) => d.diff_final_score + acc,
                                0,
                            )}
                        />
                    </Box>
                </Table.Td>
                {services.map((service, i) => (
                    <Table.Td key={i}>
                        <ServiceScoreData
                            score={teamData.services.find(
                                (ele) => ele.service == service.name,
                            )}
                        />
                    </Table.Td>
                ))}
            </Table.Tr>
        );
    },
);

export const ScoreboardPage = () => {
    const chartData = useChartQuery();
    const scoreboardData = useScoreboardQuery();
    const configData = useStatusQuery();
    const teamSolver = useTeamSolver();
    const navigate = useNavigate();
    const setLoading = useGlobalState((state) => state.setLoading);

    const services = useMemo(
        () => configData.data?.services.sort() ?? [],
        [configData.data?.services],
    );

    const series = useMemo(
        () =>
            configData.data?.teams
                .sort((a, b) => a.host.localeCompare(b.host))
                .map((team) => ({
                    label: team.name,
                    color: team.nop
                        ? "grey"
                        : hashedColor(team.name + team.host),
                    name: btoa(team.host),
                })) ?? [],
        [configData.data?.teams],
    );

    const dataLoaded =
        chartData.isSuccess && scoreboardData.isSuccess && configData.isSuccess;
    const tableRef = useStickyScrollableHeader({
        headHeight: 60,
        topOffset: 60,
    });

    useEffect(() => {
        if (!dataLoaded) {
            setLoading(true);
        } else {
            setLoading(false);
        }
    }, [dataLoaded, setLoading]);

    const processedChartData = useMemo(
        () =>
            chartData.data?.map((round, i) => ({
                round: i,
                ...round.scores.reduce(
                    (acc, score) => ({
                        ...acc,
                        [btoa(score.team)]: score.score.toFixed(2),
                    }),
                    {},
                ),
            })),
        [chartData.data],
    );

    const { minPoints, maxPoints } = useMemo(() => {
        if (!chartData.data) return { minPoints: 0, maxPoints: 0 };

        let min = Infinity;
        let max = 0;

        for (const round of chartData.data) {
            for (const score of round.scores) {
                min = Math.min(min, score.score);
                max = Math.max(max, score.score);
            }
        }

        return {
            minPoints:
                min === Infinity
                    ? 0
                    : Math.round(Math.max(min - min * 0.05, 0)),
            maxPoints: Math.round(max + max * 0.05),
        };
    }, [chartData.data]);

    const rows = useMemo(
        () =>
            (scoreboardData.data?.scores.length ?? 0) > 0
                ? scoreboardData.data?.scores
                      .sort(scoreBoardSortFunction)
                      .map((teamData, pos) => {
                          return (
                              <TeamRow
                                  key={teamData.team}
                                  clickable
                                  teamData={teamData}
                                  pos={pos}
                                  services={services}
                                  teamInfo={teamSolver(teamData.team)}
                              />
                          );
                      })
                : configData.data?.teams
                      .sort((a, b) => a.id - b.id)
                      .map((ele, pos) => {
                          return (
                              <TeamRow
                                  key={ele.id}
                                  teamData={{
                                      team: ele.host,
                                      score: 0,
                                      services: configData.data.services.map(
                                          (service) => ({
                                              service: service.name,
                                              stolen_flags: 0,
                                              lost_flags: 0,
                                              sla: 0,
                                              score: 0,
                                              ticks_up: 0,
                                              ticks_down: 0,
                                              put_flag: 0,
                                              put_flag_msg: "",
                                              get_flag: 0,
                                              get_flag_msg: "",
                                              offensive_points: 0,
                                              defensive_points: 0,
                                              sla_check: 0,
                                              sla_check_msg: "",
                                              final_score: 0,
                                              diff_stolen_flags: 0,
                                              diff_lost_flags: 0,
                                              diff_offensive_points: 0,
                                              diff_defensive_points: 0,
                                              diff_sla: 0,
                                              diff_score: 0,
                                              diff_final_score: 0,
                                          }),
                                      ),
                                  }}
                                  pos={pos}
                                  services={services}
                                  teamInfo={ele}
                              />
                          );
                      }),
        [scoreboardData.data?.scores, services, teamSolver, navigate],
    );

    if (chartData.isError || scoreboardData.isError || configData.isError) {
        return <Box>Error loading scoreboard data. Please try again.</Box>;
    }

    if (!dataLoaded) return <></>;
    return (
        <Box>
            <Title order={1} mb="60px" mt="xs">
                Scoreboard
            </Title>
            <LineChart
                connectNulls
                data={processedChartData ?? []}
                yAxisProps={{ domain: [minPoints, maxPoints] }}
                dataKey="round"
                yAxisLabel="Points"
                xAxisLabel="Round"
                series={series}
                tooltipProps={{
                    content: ({ label, payload }) => (
                        <ChartTooltip label={label} payload={payload} />
                    ),
                }}
                withLegend
                legendProps={{ verticalAlign: "bottom" }}
                curveType="linear"
                h={450}
            />

            <RoundCounter />
            <Space h="lg" />
            <ScrollAreaAutosize>
                <Table highlightOnHover striped ref={tableRef}>
                    <Table.Thead
                        h={60}
                        style={{
                            backgroundColor: "var(--mantine-color-dark-8)",
                        }}
                    >
                        <Table.Tr>
                            <Table.Th style={{ width: "10px" }} px="md">
                                <Box className="center-flex">
                                    <FaHashtag size={20} />
                                </Box>
                            </Table.Th>
                            <Table.Th style={{ width: "140px" }}>
                                {/*Image*/}
                            </Table.Th>
                            <Table.Th style={{ width: "fit" }}>
                                <Box className="center-flex">
                                    <MdGroups size={26} />
                                    <Space w="xs" />
                                    Team
                                </Box>
                            </Table.Th>
                            <Table.Th>
                                <Box className="center-flex">
                                    <ImTarget size={20} />
                                    <Space w="xs" />
                                    Score
                                </Box>
                            </Table.Th>
                            {services.map((service) => (
                                <Table.Th key={service.name}>
                                    <Box
                                        className="center-flex"
                                        style={{ width: "100%" }}
                                    >
                                        <FaServer size={20} />
                                        <Space w="xs" />
                                        {service.name}
                                    </Box>
                                </Table.Th>
                            ))}
                        </Table.Tr>
                    </Table.Thead>
                    <Table.Tbody>{rows}</Table.Tbody>
                </Table>
            </ScrollAreaAutosize>
        </Box>
    );
};
